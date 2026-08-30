package com.scriptmanager.common.config

import com.machingclee.domain.util.common.command.CustomCommandAuditor
import com.machingclee.domain.util.common.command.CustomCommandInvoker
import com.machingclee.domain.util.common.interfaces.CommandAuditorPort
import com.machingclee.domain.util.common.interfaces.CommandInvoker
import com.machingclee.domain.util.common.interfaces.DomainEventDispatcher
import com.scriptmanager.repository.EventRepository
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager

/**
 * Manual wiring of the domain-util write-path beans.
 *
 * The library's own `DomainUtilAuditAutoConfiguration` is built for Spring Boot 4
 * (its `@AutoConfiguration(afterName = ...)` references Boot 4 package names), so
 * in this Boot 3.2 project its `@ConditionalOnBean(PlatformTransactionManager)`
 * never matches and the CommandInvoker bean is never created. Declaring the same
 * beans here as plain user beans makes the wiring deterministic.
 *
 * Note: the [DomainEventLogger] bean is intentionally NOT declared here — it is
 * provided by [SqliteDomainEventLogger] (a component), which joins the in-flight
 * transaction for immediate events so SQLite's single-writer lock is not violated.
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
}
