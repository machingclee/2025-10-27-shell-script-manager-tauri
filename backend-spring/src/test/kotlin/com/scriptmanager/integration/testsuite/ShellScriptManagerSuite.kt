package com.scriptmanager.integration.testsuite

import com.scriptmanager.integration.domain.ai.AiProfileTest
import com.scriptmanager.integration.domain.ai.ModelConfigTest
import com.scriptmanager.integration.infra.database.MinimalDatabaseTest
import com.scriptmanager.integration.domain.scriptmanager.WorkspaceTest
import com.scriptmanager.integration.domain.scriptmanager.FolderTest
import com.scriptmanager.integration.domain.scriptmanager.ScriptTest
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

