<?php
/**
 * MailForge custom skin overrides for Roundcube
 * Adds polished typography and styling to email message display.
 */
class mailforge_style extends rcube_plugin
{
    public function init()
    {
        $this->include_stylesheet('styles/custom.css');
    }
}
