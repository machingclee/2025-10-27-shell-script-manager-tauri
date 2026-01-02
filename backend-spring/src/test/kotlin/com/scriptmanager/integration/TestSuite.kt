package com.scriptmanager.integration

import com.scriptmanager.integration.ai.AiProfileTest
import com.scriptmanager.integration.ai.ModelConfigTest
import com.scriptmanager.integration.database.MinimalDatabaseTest
import com.scriptmanager.integration.scriptmanager.WorkspaceTest
import com.scriptmanager.integration.scriptmanager.FolderTest
import com.scriptmanager.integration.scriptmanager.ScriptTest
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
class TestSuite

