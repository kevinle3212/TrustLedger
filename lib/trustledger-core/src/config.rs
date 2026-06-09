//! Environment configuration helpers for Rust services.

use serde::{Deserialize, Serialize};

/// Runtime configuration for the Rust admin API.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct AdminApiConfig {
    /// Socket address the service binds to.
    pub bind: String,
    /// Whether bearer-token auth is configured.
    pub token_configured: bool,
    /// Optional public deployment environment label.
    pub environment: String,
}

impl AdminApiConfig {
    /// Builds admin API config from environment-like key/value lookup.
    #[must_use]
    pub fn from_lookup(mut lookup: impl FnMut(&str) -> Option<String>) -> Self {
        Self {
            bind: lookup("TRUSTLEDGER_ADMIN_API_BIND")
                .unwrap_or_else(|| "127.0.0.1:4100".to_owned()),
            token_configured: lookup("TRUSTLEDGER_ADMIN_API_TOKEN")
                .is_some_and(|value| !value.trim().is_empty()),
            environment: lookup("TRUSTLEDGER_ENV")
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "local".to_owned()),
        }
    }

    /// Returns a redacted view suitable for health and admin summaries.
    #[must_use]
    pub fn redacted(&self) -> RedactedAdminApiConfig {
        RedactedAdminApiConfig {
            bind: self.bind.clone(),
            token_configured: self.token_configured,
            environment: self.environment.clone(),
        }
    }
}

/// Secret-free admin API config view.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct RedactedAdminApiConfig {
    /// Socket address the service binds to.
    pub bind: String,
    /// Whether bearer-token auth is configured.
    pub token_configured: bool,
    /// Public deployment environment label.
    pub environment: String,
}
