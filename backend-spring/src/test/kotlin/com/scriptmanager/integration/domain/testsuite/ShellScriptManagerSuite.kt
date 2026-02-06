package com.scriptmanager.integration.boundedcontext.testsuite

import com.scriptmanager.integration.boundedcontext.ai.aiprofile.AiProfileTest
import com.scriptmanager.integration.boundedcontext.ai.modelconfig.ModelConfigTest
import com.scriptmanager.integration.boundedcontext.scriptmanager.FolderTest
import com.scriptmanager.integration.boundedcontext.scriptmanager.ScriptTest
import com.scriptmanager.integration.boundedcontext.scriptmanager.WorkspaceTest
import com.scriptmanager.integration.infra.database.MinimalDatabaseTest
import org.junit.platform.suite.api.SelectClasses
import org.junit.platform.suite.api.Suite
import org.junit.platform.suite.api.SuiteDisplayName


@Suite
@SuiteDisplayName("Script Manager Integration Tests - All Domains")
@SelectClasses(
    MinimalDatabaseTest::class,
    WorkspaceTest::class,
    FolderTest::class,
    ScriptTest::class,
    AiProfileTest::class,
    ModelConfigTest::class
)
class ShellScriptManagerSuite

