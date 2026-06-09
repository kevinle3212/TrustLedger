//! Shared Rust domain models, configuration, audit, and validation helpers for
//! `TrustLedger` services.

pub mod audit;
pub mod config;

use serde::{Deserialize, Serialize};

pub use audit::{readonly_health_event, Event, Severity};
pub use config::{ApiConfig, RedactedConfig};

/// High-level status returned by Rust service health probes.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum ServiceStatus {
    /// The service is ready to accept traffic.
    Ok,
    /// The service is running but missing optional configuration.
    Warning,
    /// The service cannot perform its required role.
    Blocked,
}

/// Minimal health response shared by Rust API services.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ServiceHealth {
    /// Machine-readable service name.
    pub service: String,
    /// Current service status.
    pub status: ServiceStatus,
    /// Human-readable status detail without secrets.
    pub detail: String,
}

/// Builds a safe health response.
#[must_use]
pub fn service_health(service: &str, configured: bool) -> ServiceHealth {
    ServiceHealth {
        service: service.to_owned(),
        status: if configured {
            ServiceStatus::Ok
        } else {
            ServiceStatus::Warning
        },
        detail: if configured {
            "required configuration is present".to_owned()
        } else {
            "required configuration is missing".to_owned()
        },
    }
}

#[cfg(test)]
mod tests {
    use super::{readonly_health_event, service_health, ApiConfig, ServiceStatus, Severity};

    #[test]
    fn service_health_reports_configuration_state() {
        let health = service_health("admin-api", true);

        assert_eq!(health.status, ServiceStatus::Ok);
        assert_eq!(health.service, "admin-api");
    }

    #[test]
    fn config_redacts_token_presence() {
        let config = ApiConfig::from_lookup(|key| match key {
            "TRUSTLEDGER_ADMIN_API_TOKEN" => Some("secret".to_owned()),
            "TRUSTLEDGER_ENV" => Some("test".to_owned()),
            _ => None,
        });

        assert!(config.redacted().token_configured);
        assert_eq!(config.environment, "test");
    }

    #[test]
    fn audit_event_has_no_secret_payload() {
        let event = readonly_health_event("admin-api", false);

        assert_eq!(event.severity, Severity::Warning);
        assert_eq!(event.metadata.get("authorized"), Some(&"false".to_owned()));
    }
}
