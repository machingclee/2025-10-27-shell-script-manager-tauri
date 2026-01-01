package com.scriptmanager.integration

import com.scriptmanager.integration.database.MinimalDatabaseTest
import com.scriptmanager.integration.shellscriptmanager.SimpleEventTest
import org.junit.platform.suite.api.SelectClasses
import org.junit.platform.suite.api.Suite
import org.junit.platform.suite.api.SuiteDisplayName


@Suite
@SuiteDisplayName("Integration Tests with Data Setup")
@SelectClasses(
    MinimalDatabaseTest::class,         // Runs FIRST
    SimpleEventTest::class              // Runs SECOND

)
class TestSuite

