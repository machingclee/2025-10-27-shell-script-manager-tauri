-- Drop unused AI feature tables (profiles, model configs, scripted tools).
-- V1 is left unchanged so existing Flyway checksums stay valid.

ALTER TABLE application_state DROP COLUMN IF EXISTS selected_aiprofile_id;

ALTER TABLE ai_profile DROP CONSTRAINT IF EXISTS ai_profile_selected_model_config_id_fkey;
ALTER TABLE rel_shellscript_aiconfig DROP CONSTRAINT IF EXISTS rel_shellscript_aiconfig_shell_script_id_fkey;
ALTER TABLE rel_shellscript_aiconfig DROP CONSTRAINT IF EXISTS rel_shellscript_aiconfig_script_ai_config_id_fkey;
ALTER TABLE rel_aiprofile_modelconfig DROP CONSTRAINT IF EXISTS rel_aiprofile_modelconfig_ai_profile_id_fkey;
ALTER TABLE rel_aiprofile_modelconfig DROP CONSTRAINT IF EXISTS rel_aiprofile_modelconfig_model_config_id_fkey;
ALTER TABLE azure_model_config DROP CONSTRAINT IF EXISTS azure_model_config_model_config_id_fkey;
ALTER TABLE openai_model_config DROP CONSTRAINT IF EXISTS openai_model_config_model_config_id_fkey;
ALTER TABLE ai_scripted_tool DROP CONSTRAINT IF EXISTS ai_scripted_tool_shell_script_id_fkey;
ALTER TABLE rel_aiprofile_aiscriptedtool DROP CONSTRAINT IF EXISTS rel_aiprofile_aiscriptedtool_ai_profile_id_fkey;
ALTER TABLE rel_aiprofile_aiscriptedtool DROP CONSTRAINT IF EXISTS rel_aiprofile_aiscriptedtool_ai_scripted_tool_id_fkey;

DROP TABLE IF EXISTS rel_aiprofile_aiscriptedtool;
DROP TABLE IF EXISTS rel_aiprofile_modelconfig;
DROP TABLE IF EXISTS rel_shellscript_aiconfig;
DROP TABLE IF EXISTS ai_scripted_tool;
DROP TABLE IF EXISTS azure_model_config;
DROP TABLE IF EXISTS openai_model_config;
DROP TABLE IF EXISTS ai_profile;
DROP TABLE IF EXISTS script_ai_config;
DROP TABLE IF EXISTS model_config;
