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
package service

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"veloera/dto"
	"veloera/relay/helper"
	"veloera/setting"
)

type moderationRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

type moderationResponse struct {
	Results []struct {
		Flagged bool `json:"flagged"`
	} `json:"results"`
	Flagged bool `json:"flagged"`
}

// CallModeration invokes external moderation API and returns whether content is flagged.
func CallModeration(ctx context.Context, cfg setting.ModerationConfig, messages []dto.Message) (bool, error) {
	inputs := make([]string, 0, len(messages))
	for _, m := range messages {
		if s := m.StringContent(); s != "" {
			inputs = append(inputs, s)
		}
	}
	payload := moderationRequest{Model: cfg.ModerationModel, Input: inputs}
	body, err := json.Marshal(payload)
	if err != nil {
		return false, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.ModerationAPIURL, bytes.NewBuffer(body))
	if err != nil {
		return false, err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.ModerationAPIKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}
	var mr moderationResponse
	if err := json.Unmarshal(respBody, &mr); err != nil {
		return false, err
	}
	if mr.Flagged {
		return true, nil
	}
	for _, r := range mr.Results {
		if r.Flagged {
			return true, nil
		}
	}
	return false, nil
}

// RespondWithModerationRejection writes rejection message to client in stream or non-stream mode.
func RespondWithModerationRejection(c *gin.Context, message, model string, isStream bool) {
	if isStream {
		helper.SetEventStreamHeaders(c)
		chunk := dto.ChatCompletionsStreamResponse{
			Id:      helper.GetResponseID(c),
			Object:  "chat.completion.chunk",
			Created: time.Now().Unix(),
			Model:   model,
			Choices: []dto.ChatCompletionsStreamResponseChoice{{}},
		}
		chunk.Choices[0].Delta.SetContentString(message)
		chunk.Choices[0].Delta.Role = "assistant"
		finish := "stop"
		chunk.Choices[0].FinishReason = &finish
		_ = helper.ObjectData(c, &chunk)
		helper.Done(c)
	} else {
		msg := dto.Message{Role: "assistant"}
		msg.SetStringContent(message)
		resp := dto.TextResponse{
			Id:      helper.GetResponseID(c),
			Object:  "chat.completion",
			Created: time.Now().Unix(),
			Model:   model,
			Choices: []dto.OpenAITextResponseChoice{{
				Index:        0,
				Message:      msg,
				FinishReason: "stop",
			}},
		}
		c.JSON(http.StatusOK, resp)
	}
}
