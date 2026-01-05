package com.scriptmanager.common.config

import com.scriptmanager.common.entity.*
import com.scriptmanager.domain.scriptmanager.command.appstate.UpdateAppStateCommand
import com.scriptmanager.domain.scriptmanager.command.folder.*
import com.scriptmanager.domain.scriptmanager.command.script.*
import com.scriptmanager.domain.scriptmanager.command.workspace.*
import com.scriptmanager.domain.scriptmanager.event.*
import org.springframework.aot.hint.MemberCategory
import org.springframework.aot.hint.RuntimeHints
import org.springframework.aot.hint.RuntimeHintsRegistrar
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
            AppStateDTO::class.java,
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

@Configuration
@ImportRuntimeHints(NativeHintsRegistrar::class)
class NativeConfiguration

