package com.scriptmanager.integration

import com.scriptmanager.integration.ai.AiProfileTest
import com.scriptmanager.integration.ai.ModelConfigTest
import com.scriptmanager.integration.database.MinimalDatabaseTest
import com.scriptmanager.integration.workspace.WorkspaceCreationTest
import com.scriptmanager.integration.workspace.WorkspaceManagementTest
import com.scriptmanager.integration.folder.FolderCreationTest
import com.scriptmanager.integration.script.ScriptLifecycleTest
import org.junit.platform.suite.api.SelectClasses
import org.junit.platform.suite.api.Suite
import org.junit.platform.suite.api.SuiteDisplayName


/**
 * Master test suite that runs all integration tests organized by REST API resources:
 *
 * Infrastructure Tests:
 * - Database connectivity
 * - Event emission smoke tests
 *
 * ScriptManager Domain (com.scriptmanager.domain.scriptmanager):
 * - Workspace APIs: POST, PUT, DELETE /workspace
 * - Folder APIs: POST, PUT, DELETE /folder
 * - Script APIs: POST, PUT, DELETE /script
 *
 * AI Domain (com.scriptmanager.domain.ai):
 * - AI Profile APIs: POST /ai/ai-profile
 * - Model Config APIs: POST /ai/model-config
 *
 * Run with: ./gradlew test --tests "TestSuite"
 */
@Suite
@SuiteDisplayName("Script Manager Integration Tests - All Domains")
@SelectClasses(
    // Infrastructure & Smoke Tests
    MinimalDatabaseTest::class,

    // ScriptManager Domain - Workspace APIs
    WorkspaceCreationTest::class,
    WorkspaceManagementTest::class,

    // ScriptManager Domain - Folder APIs
    FolderCreationTest::class,

    // ScriptManager Domain - Script APIs
    ScriptLifecycleTest::class,

    // AI Domain - AI APIs
    AiProfileTest::class,
    ModelConfigTest::class
)
class TestSuite

