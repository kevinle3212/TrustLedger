//! Audit-safe event models shared by Rust services.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Severity for an audit event that is safe to expose to operators.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditSeverity {
    /// Informational event.
    Info,
    /// Event needs follow-up but is not blocking service operation.
    Warning,
    /// Event indicates a blocked or security-sensitive condition.
    Critical,
}

/// Redacted audit event. Never store raw secrets, private keys, or documents.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct AuditEvent {
    /// Stable event category.
    pub category: String,
    /// Machine-readable action.
    pub action: String,
    /// Event severity.
    pub severity: AuditSeverity,
    /// Redacted metadata safe for operator dashboards.
    pub metadata: BTreeMap<String, String>,
}

/// Builds a read-only health-check audit event.
#[must_use]
pub fn readonly_health_audit(service: &str, authorized: bool) -> AuditEvent {
    let mut metadata = BTreeMap::new();
    metadata.insert("service".to_owned(), service.to_owned());
    metadata.insert("authorized".to_owned(), authorized.to_string());

    AuditEvent {
        category: "admin_api".to_owned(),
        action: "health_check".to_owned(),
        severity: if authorized {
            AuditSeverity::Info
        } else {
            AuditSeverity::Warning
        },
        metadata,
    }
}
