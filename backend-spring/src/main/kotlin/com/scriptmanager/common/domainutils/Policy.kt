package com.scriptmanager.common.domainutils

/**
 * Marker interface for domain policies.
 * Policies listen to domain events and may invoke commands in response.
 * Use @NextCommand and @Invariant annotations on handler methods to declare flows and invariants.
 */
interface Policy

