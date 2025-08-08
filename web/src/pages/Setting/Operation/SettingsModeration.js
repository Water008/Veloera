/*
Copyright (c) 2025 Tethys Plex

This file is part of Veloera.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import React, { useEffect, useState, useRef } from 'react';
import { Button, Col, Form, Row, Spin, Typography } from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsModeration(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    moderation_service: 'veloera',
    moderation_api_url: '',
    moderation_api_key: '',
    moderation_model: '',
    moderation_auto_ban: false,
    moderation_no_error: false,
    moderation_reject_message:
      'This request may violate our Terms of Use. If you have any questions, please contact the site administrator.',
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = inputs[item.key];
      }
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined))
            return showError(t('部分保存失败，请重试'));
        }
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const currentInputs = {};
    for (let key in props.options) {
      if (Object.keys(inputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    if (currentInputs.moderation_service === 'veloera') {
      currentInputs.moderation_api_url = '';
      currentInputs.moderation_api_key = '';
      currentInputs.moderation_model = '';
    } else {
      if (!currentInputs.moderation_model) {
        currentInputs.moderation_model = 'text-moderation-latest';
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    refForm.current.setValues(currentInputs);
  }, [props.options]);

  const isVeloera = inputs.moderation_service === 'veloera';

  return (
    <>
      <Spin spinning={loading}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('道德审查设置')}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.RadioGroup
                  field={'moderation_service'}
                  label={t('审查服务来源')}
                  type='button'
                  onChange={(value) => {
                    setInputs({
                      ...inputs,
                      moderation_service: value,
                      moderation_api_url: value === 'veloera' ? '' : inputs.moderation_api_url,
                      moderation_api_key: value === 'veloera' ? '' : inputs.moderation_api_key,
                      moderation_model:
                        value === 'veloera'
                          ? ''
                          : inputs.moderation_model || 'text-moderation-latest',
                    });
                  }}
                >
                  <Form.Radio value='veloera'>
                    {t('使用 Veloera 免费审查服务')}
                  </Form.Radio>
                  <Form.Radio value='custom'>
                    {t('使用自有 OpenAI 兼容审查服务')}
                  </Form.Radio>
                </Form.RadioGroup>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'moderation_api_url'}
                  label={t('审查 API URL')}
                  placeholder={t('使用自有服务时填写完整 URL')}
                  disabled={isVeloera}
                  rules={[
                    {
                      required: !isVeloera,
                      message: t('请输入完整 URL'),
                    },
                    {
                      validator: (rule, value) => {
                        if (isVeloera) return true;
                        try {
                          if (!value) return false;
                          new URL(value);
                          return true;
                        } catch (e) {
                          return false;
                        }
                      },
                      message: t('请输入合法 URL'),
                    },
                  ]}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      moderation_api_url: value,
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'moderation_api_key'}
                  label={t('审查 API Key')}
                  type='password'
                  disabled={isVeloera}
                  rules={[
                    {
                      required: !isVeloera,
                      message: t('请输入 API Key'),
                    },
                  ]}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      moderation_api_key: value,
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'moderation_model'}
                  label={t('审查模型')}
                  placeholder={t('text-moderation-latest')}
                  disabled={isVeloera}
                  rules={[
                    {
                      required: !isVeloera,
                      message: t('请输入模型'),
                    },
                  ]}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      moderation_model: value,
                    })
                  }
                />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'moderation_auto_ban'}
                  label={t('自动封禁账户（不推荐）')}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      moderation_auto_ban: value,
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'moderation_no_error'}
                  label={t('不报错（不推荐）')}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      moderation_no_error: value,
                    })
                  }
                />
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.TextArea
                  field={'moderation_reject_message'}
                  label={t('拒绝消息')}
                  autosize={{ minRows: 3, maxRows: 6 }}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      moderation_reject_message: value,
                    })
                  }
                />
              </Col>
            </Row>
            <Row style={{ marginBottom: 10 }}>
              <Col>
                <Typography.Text type='tertiary'>
                  {t('此设置受【安全审查豁免】分组设置约束；开启自动封禁账户将跳过管理员。')}
                </Typography.Text>
              </Col>
            </Row>
            <Row>
              <Button size='default' onClick={onSubmit}>
                {t('保存道德审查设置')}
              </Button>
            </Row>
          </Form.Section>
        </Form>
      </Spin>
    </>
  );
}
