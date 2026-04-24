package com.scriptmanager.boundedcontext.scriptmanager.policy

import com.scriptmanager.common.domainutils.Invariant
import com.scriptmanager.common.domainutils.PlaceholderEvent
import com.scriptmanager.common.domainutils.Policy
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component


@Component
class IsEditingFlagPolicy : Policy {
    @EventListener
    @Invariant("When there is any change, is_editing should be true")
    fun `When there is any change, is_editing should be true`(event: PlaceholderEvent) {

    }

    @EventListener
    @Invariant("When we save an item, is_editing should be false")
    fun `When we save an item, is_editing should be false`(event: PlaceholderEvent) {

    }


    @EventListener
    @Invariant("When we click \"leave anyway\", update is_editing to false")
    fun `When we click 'leave anyway', update is_editing to false`(event: PlaceholderEvent) {

    }
}