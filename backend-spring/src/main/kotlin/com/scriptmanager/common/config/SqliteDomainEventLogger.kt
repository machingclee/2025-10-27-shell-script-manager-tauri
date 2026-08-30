package com.scriptmanager.common.config

import com.machingclee.domain.util.autoconfigure.AuditEventTypeResolver
import com.machingclee.domain.util.common.event.DomainEventLogger
import com.machingclee.domain.util.common.event.EventWrapper
import com.scriptmanager.common.entity.Event
import com.scriptmanager.repository.EventRepository
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.util.function.Supplier

/**
 * SQLite-compatible domain event logger.
 *
 * The library's [DomainEventLogger] persists each immediate event in a
 * `REQUIRES_NEW` transaction, which deadlocks with SQLite's single-writer model
 * while the dispatching command transaction is still holding the write lock
 * (the app saw `SQLITE_BUSY`/`database is locked` on every command).
 *
 * This override joins the in-flight transaction for immediate events
 * (`MANDATORY`), exactly like the original pre-library logger, so event audit
 * rows are written by the command's own connection. Post-commit events
 * (`recordTransactionalEvent`) are left untouched since they run after the
 * transaction has released the lock.
 */
@Component
class SqliteDomainEventLogger(
    eventRepository: EventRepository,
    publisher: ApplicationEventPublisher
) : DomainEventLogger(eventRepository, AuditEventRepositoryFactory.eventFactory(eventRepository), publisher) {

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    override fun recordSynchronousEvent(wrapperEvent: EventWrapper<Any>) {
        super.recordSynchronousEvent(wrapperEvent)
    }
}

/** Shared event-factory helper so all audit beans use the same resolved entity supplier. */
object AuditEventRepositoryFactory {
    @Suppress("UNCHECKED_CAST")
    fun eventFactory(eventRepository: EventRepository): Supplier<Event> =
        AuditEventTypeResolver.factory(AuditEventTypeResolver.resolve(eventRepository)) as Supplier<Event>
}
