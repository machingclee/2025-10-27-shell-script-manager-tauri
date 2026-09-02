package com.scriptmanager.common.config

import com.scriptmanager.boundedcontext.scriptmanager.command.appstate.UpdateAppStateCommand
import com.scriptmanager.boundedcontext.scriptmanager.command.folder.*
import com.scriptmanager.boundedcontext.scriptmanager.command.script.*
import com.scriptmanager.boundedcontext.scriptmanager.command.workspace.*
import com.scriptmanager.boundedcontext.scriptmanager.event.*
import com.scriptmanager.common.entity.*
import org.springframework.aot.hint.MemberCategory
import org.springframework.aot.hint.RuntimeHints
import org.springframework.aot.hint.RuntimeHintsRegistrar
import org.springframework.aot.hint.TypeReference
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.ImportRuntimeHints

/**
 * Registers runtime hints for GraalVM Native Image.
 * This ensures all Command, Event, and DTO classes can be properly
 * serialized/deserialized by Jackson in native images.
 */
class NativeHintsRegistrar : RuntimeHintsRegistrar {
    override fun registerHints(hints: RuntimeHints, classLoader: ClassLoader?) {
        // Register all Event classes
        registerForReflection(
            hints,
            AppStateUpdatedEvent::class.java,
            FolderCreatedEvent::class.java,
            FolderUpdatedEvent::class.java,
            FolderDeletedEvent::class.java,
            FoldersReorderedEvent::class.java,
            SubfolderAddedEvent::class.java,
            ScriptCreatedEvent::class.java,
            ScriptUpdatedEvent::class.java,
            ScriptDeletedEvent::class.java,
            ScriptsReorderedEvent::class.java,
            ScriptMovedToFolderEvent::class.java,
            WorkspaceCreatedEvent::class.java,
            WorkspaceUpdatedEvent::class.java,
            WorkspaceStatusUpdatedEvent::class.java,
            WorkspaceDeletedEvent::class.java,
            WorkspacesReorderedEvent::class.java,
            FolderAddedToWorkspaceEvent::class.java,
            FolderRemovedFromWorkspaceEvent::class.java,
            WorkspaceFoldersReorderedEvent::class.java,
            FolderCreatedInWorkspaceEvent::class.java,
            ScriptHistoryCreatedEvent::class.java
        )

        // Register all Command classes
        registerForReflection(
            hints,
            CreateFolderCommand::class.java,
            CreateFolderInWorkspaceCommand::class.java,
            CreateScriptCommand::class.java,
            CreateScriptHistoryCommand::class.java,
            CreateWorkspaceCommand::class.java,
            UpdateFolderCommand::class.java,
            UpdateScriptCommand::class.java,
            UpdateWorkspaceCommand::class.java,
            UpdateWorkspaceStatusCommand::class.java,
            UpdateAppStateCommand::class.java,
            DeleteFolderCommand::class.java,
            DeleteScriptCommand::class.java,
            DeleteWorkspaceCommand::class.java,
            ReorderFoldersCommand::class.java,
            ReorderScriptsCommand::class.java,
            ReorderWorkspacesCommand::class.java,
            ReorderWorkspaceFoldersCommand::class.java,
            MoveFolderToWorkspaceCommand::class.java,
            AddSubfolderCommand::class.java,
            RemoveFolderFromWorkspaceCommand::class.java,
            MoveScriptToFolderCommand::class.java
        )

        // Register Entity/DTO classes
        registerForReflection(
            hints,
            ApplicationState::class.java,
            EventDTO::class.java,
            HistoricalShellScriptDTO::class.java,
            ScriptsFolderDTO::class.java,
            ShellScriptDTO::class.java,
            WorkspaceDTO::class.java
        )
    }

    private fun registerForReflection(hints: RuntimeHints, vararg classes: Class<*>) {
        classes.forEach { clazz ->
            hints.reflection().registerType(
                clazz,
                MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                MemberCategory.INVOKE_DECLARED_METHODS,
                MemberCategory.DECLARED_FIELDS
            )
        }
    }
}

/**
 * Hibernate 7.2 generates a `*_$logger` class per `@MessageLogger` interface.
 * JBoss Logging loads those via `Class.forName`, which native-image drops unless
 * they are registered. GraalVM reachability metadata 0.11.1 only covers
 * hibernate-core 7.1, and Spring Boot 4.0.2+ no longer ships Hibernate72RuntimeHints.
 */
class Hibernate72LoggerHints : RuntimeHintsRegistrar {
    override fun registerHints(hints: RuntimeHints, classLoader: ClassLoader?) {
        HIBERNATE_72_LOGGERS.forEach { name ->
            hints.reflection().registerType(
                TypeReference.of(name),
                MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                MemberCategory.INVOKE_PUBLIC_METHODS
            )
        }
        hints.resources().registerPattern("org/hibernate/**/*.i18n.properties")

        // kotlin-reflect / Spring Data KotlinBeanInfoFactory call Parameter.getName()
        hints.reflection().registerType(
            TypeReference.of("java.lang.reflect.Parameter"),
            MemberCategory.INVOKE_DECLARED_METHODS,
            MemberCategory.INVOKE_PUBLIC_METHODS,
            MemberCategory.INVOKE_DECLARED_CONSTRUCTORS
        )
        hints.reflection().registerType(
            TypeReference.of("java.lang.reflect.Method"),
            MemberCategory.INVOKE_DECLARED_METHODS,
            MemberCategory.INVOKE_PUBLIC_METHODS
        )
        hints.reflection().registerType(
            TypeReference.of("java.lang.reflect.Constructor"),
            MemberCategory.INVOKE_DECLARED_METHODS,
            MemberCategory.INVOKE_PUBLIC_METHODS
        )
        hints.reflection().registerType(
            TypeReference.of("java.lang.reflect.Executable"),
            MemberCategory.INVOKE_DECLARED_METHODS,
            MemberCategory.INVOKE_PUBLIC_METHODS
        )

        // Jackson kotlin module introspects emptyList()/emptySet() as these classes.
        listOf(
            "kotlin.collections.EmptyList",
            "kotlin.collections.EmptySet",
            "kotlin.collections.EmptyMap",
            "kotlin.collections.EmptyIterator",
        ).forEach { name ->
            hints.reflection().registerType(
                TypeReference.of(name),
                MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                MemberCategory.INVOKE_PUBLIC_METHODS,
                MemberCategory.INVOKE_DECLARED_METHODS,
                MemberCategory.DECLARED_FIELDS
            )
        }

        // springdoc MethodParameterPojoExtractor and kotlin-reflect call
        // RecordComponent.getAccessor() while building /v3/api-docs.
        hints.reflection().registerType(
            TypeReference.of("java.lang.reflect.RecordComponent"),
            MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
            MemberCategory.INVOKE_PUBLIC_METHODS,
            MemberCategory.INVOKE_DECLARED_METHODS,
            MemberCategory.DECLARED_FIELDS
        )
        hints.reflection().registerType(
            TypeReference.of("java.lang.Class"),
            MemberCategory.INVOKE_DECLARED_METHODS,
            MemberCategory.INVOKE_PUBLIC_METHODS
        )
        listOf(
            "java.beans.Introspector",
            "java.beans.BeanInfo",
            "java.beans.PropertyDescriptor",
        ).forEach { name ->
            hints.reflection().registerType(
                TypeReference.of(name),
                MemberCategory.INVOKE_PUBLIC_METHODS,
                MemberCategory.INVOKE_DECLARED_CONSTRUCTORS
            )
        }
    }

    companion object {
        val HIBERNATE_72_LOGGERS = listOf(
            "org.hibernate.action.internal.ActionLogging_\$logger",
            "org.hibernate.boot.BootLogging_\$logger",
            "org.hibernate.boot.archive.scan.internal.ScannerLogger_\$logger",
            "org.hibernate.boot.beanvalidation.BeanValidationLogger_\$logger",
            "org.hibernate.boot.jaxb.JaxbLogger_\$logger",
            "org.hibernate.bytecode.enhance.internal.BytecodeEnhancementLogging_\$logger",
            "org.hibernate.bytecode.enhance.spi.interceptor.BytecodeInterceptorLogging_\$logger",
            "org.hibernate.cache.spi.SecondLevelCacheLogger_\$logger",
            "org.hibernate.collection.internal.CollectionLogger_\$logger",
            "org.hibernate.context.internal.CurrentSessionLogging_\$logger",
            "org.hibernate.dialect.DialectLogging_\$logger",
            "org.hibernate.engine.internal.NaturalIdLogging_\$logger",
            "org.hibernate.engine.internal.PersistenceContextLogging_\$logger",
            "org.hibernate.engine.internal.SessionMetricsLogger_\$logger",
            "org.hibernate.engine.internal.VersionLogger_\$logger",
            "org.hibernate.engine.jdbc.JdbcLogging_\$logger",
            "org.hibernate.engine.jdbc.batch.JdbcBatchLogging_\$logger",
            "org.hibernate.engine.jdbc.connections.internal.ConnectionProviderLogging_\$logger",
            "org.hibernate.engine.jdbc.env.internal.LobCreationLogging_\$logger",
            "org.hibernate.engine.jdbc.spi.SQLExceptionLogging_\$logger",
            "org.hibernate.event.internal.EntityCopyLogging_\$logger",
            "org.hibernate.event.internal.EventListenerLogging_\$logger",
            "org.hibernate.id.UUIDLogger_\$logger",
            "org.hibernate.id.enhanced.OptimizerLogger_\$logger",
            "org.hibernate.id.enhanced.SequenceGeneratorLogger_\$logger",
            "org.hibernate.id.enhanced.TableGeneratorLogger_\$logger",
            "org.hibernate.internal.CoreMessageLogger_\$logger",
            "org.hibernate.internal.SessionFactoryLogging_\$logger",
            "org.hibernate.internal.SessionFactoryRegistryMessageLogger_\$logger",
            "org.hibernate.internal.SessionLogging_\$logger",
            "org.hibernate.internal.log.ConnectionAccessLogger_\$logger",
            "org.hibernate.internal.log.ConnectionInfoLogger_\$logger",
            "org.hibernate.internal.log.DeprecationLogger_\$logger",
            "org.hibernate.internal.log.IncubationLogger_\$logger",
            "org.hibernate.internal.log.StatisticsLogger_\$logger",
            "org.hibernate.internal.log.UrlMessageBundle_\$logger",
            "org.hibernate.jpa.internal.JpaLogger_\$logger",
            "org.hibernate.loader.ast.internal.MultiKeyLoadLogging_\$logger",
            "org.hibernate.metamodel.mapping.MappingModelCreationLogging_\$logger",
            "org.hibernate.query.QueryLogging_\$logger",
            "org.hibernate.query.hql.HqlLogging_\$logger",
            "org.hibernate.resource.beans.internal.BeansMessageLogger_\$logger",
            "org.hibernate.resource.jdbc.internal.LogicalConnectionLogging_\$logger",
            "org.hibernate.resource.jdbc.internal.ResourceRegistryLogger_\$logger",
            "org.hibernate.resource.transaction.backend.jta.internal.JtaLogging_\$logger",
            "org.hibernate.resource.transaction.internal.SynchronizationLogging_\$logger",
            "org.hibernate.service.internal.ServiceLogger_\$logger",
            "org.hibernate.sql.ast.tree.SqlAstTreeLogger_\$logger",
            "org.hibernate.sql.exec.SqlExecLogger_\$logger",
            "org.hibernate.sql.model.ModelMutationLogging_\$logger",
            "org.hibernate.sql.results.LoadingLogger_\$logger",
            "org.hibernate.sql.results.ResultsLogger_\$logger",
            "org.hibernate.sql.results.graph.embeddable.EmbeddableLoadingLogger_\$logger"
        )
    }
}

@Configuration
@ImportRuntimeHints(NativeHintsRegistrar::class, Hibernate72LoggerHints::class)
class NativeConfiguration

