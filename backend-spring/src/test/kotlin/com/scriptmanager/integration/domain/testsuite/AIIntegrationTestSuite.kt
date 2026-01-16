package com.scriptmanager.integration.domain.testsuite

import com.scriptmanager.integration.domain.ai.aiprofile.*
import com.scriptmanager.integration.domain.ai.aiscriptedtool.CreateAIScriptedToolCommandTest
import com.scriptmanager.integration.domain.ai.aiscriptedtool.DeleteAiScriptedToolCommandTest
import com.scriptmanager.integration.domain.ai.aiscriptedtool.UpdateAiScriptedToolCommandTest
import com.scriptmanager.integration.domain.ai.modelconfig.DeleteModelConfigCommandTest
import com.scriptmanager.integration.domain.ai.modelconfig.ModelConfigTest
import com.scriptmanager.integration.domain.ai.modelconfig.UpdateModelConfigCommandTest
import org.junit.platform.suite.api.SelectClasses
import org.junit.platform.suite.api.Suite
import org.junit.platform.suite.api.SuiteDisplayName

@Suite
@SuiteDisplayName("AI Domain Integration Tests")
@SelectClasses(
    // AI Profile Tests
    AiProfileTest::class,
    UpdateAiProfileCommandTest::class,
    DeleteAiProfileCommandTest::class,
    SelectDefaultAiProfileCommandTest::class,
    SelectAiProfileDefaultModelConfigCommandTest::class,

    // Model Config Tests
    ModelConfigTest::class,
    UpdateModelConfigCommandTest::class,
    DeleteModelConfigCommandTest::class,

    // AI Scripted Tool Tests
    CreateAIScriptedToolCommandTest::class,
    UpdateAiScriptedToolCommandTest::class,
    DeleteAiScriptedToolCommandTest::class
)
class AIIntegrationTestSuite

