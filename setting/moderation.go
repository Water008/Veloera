// Copyright (c) 2025 Tethys Plex
//
// This file is part of Veloera.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.
package setting

// ModerationConfig holds runtime moderation configuration
// populated from database options and hardcoded defaults.
type ModerationConfig struct {
	ModerationService       string
	ModerationAPIURL        string
	ModerationAPIKey        string
	ModerationModel         string
	ModerationAutoBan       bool
	ModerationNoError       bool
	ModerationRejectMessage string
}

var (
	ModerationService       = "veloera"
	ModerationAPIURL        = ""
	ModerationAPIKey        = ""
	ModerationModel         = ""
	ModerationAutoBan       = false
	ModerationNoError       = false
	ModerationRejectMessage = "This request may violate our Terms of Use. If you have any questions, please contact the site administrator."
)

// ResolveModerationRuntimeConfig returns moderation settings for runtime usage.
// If service is veloera, it returns hardcoded API values which are not stored in DB.
func ResolveModerationRuntimeConfig(userId int) ModerationConfig {
	cfg := ModerationConfig{
		ModerationService:       ModerationService,
		ModerationAPIURL:        ModerationAPIURL,
		ModerationAPIKey:        ModerationAPIKey,
		ModerationModel:         ModerationModel,
		ModerationAutoBan:       ModerationAutoBan,
		ModerationNoError:       ModerationNoError,
		ModerationRejectMessage: ModerationRejectMessage,
	}
	if cfg.ModerationService == "veloera" {
		cfg.ModerationAPIURL = "https://moderate-api.be-a.dev/v1/moderations"
		cfg.ModerationAPIKey = "sk-veloera-internal"
		cfg.ModerationModel = "text-moderation-latest"
	}
	return cfg
}

// ShouldCheckModerationWithGroup returns whether moderation should be checked
// for the given group considering SafeCheckExempt settings.
func ShouldCheckModerationWithGroup(group string) bool {
	if SafeCheckExemptEnabled && group == SafeCheckExemptGroup {
		return false
	}
	return true
}
