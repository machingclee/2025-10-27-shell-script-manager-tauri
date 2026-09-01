package com.scriptmanager.common.config

import com.machingclee.domain.util.autoconfigure.AuditEventTypeResolver
import com.machingclee.domain.util.common.command.CustomCommandAuditor
import com.machingclee.domain.util.common.command.CustomCommandInvoker
import com.machingclee.domain.util.common.event.DomainEventLogger
import com.machingclee.domain.util.common.interfaces.CommandAuditorPort
import com.machingclee.domain.util.common.interfaces.CommandInvoker
import com.machingclee.domain.util.common.interfaces.DomainEventDispatcher
import com.scriptmanager.common.entity.Event
import com.scriptmanager.repository.EventRepository
import org.springframework.context.ApplicationContext
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import java.util.function.Supplier

/**
 * Manual wiring of the domain-util write-path beans.
 *
 * The library's own `DomainUtilAuditAutoConfiguration` is built for Spring Boot 4
 * (its `@AutoConfiguration(afterName = ...)` references Boot 4 package names), so
 * in this Boot 3.2 project its `@ConditionalOnBean(PlatformTransactionManager)`
 * never matches and the beans are never created. Declaring the same beans here
 * as plain user beans makes the wiring deterministic.
 *
 * The [DomainEventLogger] uses the library defaults: immediate events are
 * persisted in their own `REQUIRES_NEW` transaction. This is safe on H2 (MVCC);
 * the SQLite-specific override that joined the in-flight transaction
 * (single-writer lock workaround) has been removed.
 */
@Configuration
class DomainUtilAuditConfig {

    @Bean
    fun commandAuditorPort(eventRepository: EventRepository): CommandAuditorPort<*> =
        CustomCommandAuditor(
            eventRepository,
            AuditEventRepositoryFactory.eventFactory(eventRepository)
        )

    @Bean
    fun commandInvoker(
        context: ApplicationContext,
        domainEventDispatcher: DomainEventDispatcher,
        transactionManager: PlatformTransactionManager,
        auditor: CommandAuditorPort<*>,
        eventRepository: EventRepository
    ): CommandInvoker = CustomCommandInvoker(context, domainEventDispatcher, transactionManager, auditor, eventRepository)

    @Bean
    fun domainEventLogger(
        eventRepository: EventRepository,
        publisher: ApplicationEventPublisher
    ): DomainEventLogger =
        DomainEventLogger(eventRepository, AuditEventRepositoryFactory.eventFactory(eventRepository), publisher)
}

/** Shared event-factory helper so all audit beans use the same resolved entity supplier. */
object AuditEventRepositoryFactory {
    @Suppress("UNCHECKED_CAST")
    fun eventFactory(eventRepository: EventRepository): Supplier<Event> =
        AuditEventTypeResolver.factory(AuditEventTypeResolver.resolve(eventRepository)) as Supplier<Event>
}
