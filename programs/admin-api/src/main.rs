//! Rust read-only admin companion API for `TrustLedger` operator tooling.

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use serde::Serialize;
use std::{env, net::SocketAddr};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use trustledger_core::{
    readonly_health_event, ApiConfig, Event, RedactedConfig, ServiceHealth, ServiceStatus,
};

const SERVICE_NAME: &str = "trustledger-admin-api";

#[derive(Clone)]
struct AppState {
    config: ApiConfig,
    token: Option<String>,
}

#[derive(Serialize)]
struct AdminSummary {
    service: &'static str,
    status: ServiceStatus,
    read_only: bool,
    config: RedactedConfig,
    routes: [&'static str; 3],
}

fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get("authorization")?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
}

fn is_authorized(headers: &HeaderMap, state: &AppState) -> bool {
    match state.token.as_deref() {
        Some(token) if !token.is_empty() => bearer_token(headers) == Some(token),
        _ => false,
    }
}

async fn health(State(state): State<AppState>, headers: HeaderMap) -> Json<ServiceHealth> {
    let authorized = is_authorized(&headers, &state);
    Json(ServiceHealth {
        service: SERVICE_NAME.to_owned(),
        status: if state.config.token_configured {
            ServiceStatus::Ok
        } else {
            ServiceStatus::Warning
        },
        detail: if authorized {
            "required configuration is present and request is authorized".to_owned()
        } else if state.config.token_configured {
            "required configuration is present".to_owned()
        } else {
            "TRUSTLEDGER_ADMIN_API_TOKEN is not configured".to_owned()
        },
    })
}

async fn summary(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AdminSummary>, StatusCode> {
    if !is_authorized(&headers, &state) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    Ok(Json(AdminSummary {
        service: SERVICE_NAME,
        status: ServiceStatus::Ok,
        read_only: true,
        config: state.config.redacted(),
        routes: ["/health", "/admin/summary", "/audit/preview"],
    }))
}

async fn audit_preview(State(state): State<AppState>, headers: HeaderMap) -> Json<Event> {
    Json(readonly_health_event(
        SERVICE_NAME,
        is_authorized(&headers, &state),
    ))
}

fn app_with_state(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/admin/summary", get(summary))
        .route("/audit/preview", get(audit_preview))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = ApiConfig::from_lookup(|key| env::var(key).ok());
    let addr: SocketAddr = config.bind.parse()?;
    let token = env::var("TRUSTLEDGER_ADMIN_API_TOKEN").ok();
    let listener = TcpListener::bind(addr).await?;
    axum::serve(listener, app_with_state(AppState { config, token })).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{app_with_state, AppState};
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;
    use trustledger_core::ApiConfig;

    fn state() -> AppState {
        AppState {
            config: ApiConfig::from_lookup(|key| match key {
                "TRUSTLEDGER_ADMIN_API_TOKEN" => Some("test-token".to_owned()),
                _ => None,
            }),
            token: Some("test-token".to_owned()),
        }
    }

    #[tokio::test]
    async fn app_builds_router() {
        let _router = app_with_state(state());
    }

    #[tokio::test]
    async fn admin_summary_requires_bearer_token(
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let request = Request::builder()
            .uri("/admin/summary")
            .body(Body::empty())?;
        let response = app_with_state(state()).oneshot(request).await?;

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        Ok(())
    }

    #[tokio::test]
    async fn admin_summary_accepts_valid_bearer_token(
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let request = Request::builder()
            .uri("/admin/summary")
            .header("authorization", "Bearer test-token")
            .body(Body::empty())?;
        let response = app_with_state(state()).oneshot(request).await?;

        assert_eq!(response.status(), StatusCode::OK);
        Ok(())
    }
}
