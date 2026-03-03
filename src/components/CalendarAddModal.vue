<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <button
          v-if="step > 0 && !canGoBackFromStep2"
          type="button"
          class="back-button"
          @click="goBack"
        >
          ← 戻る
        </button>
        <h2 class="modal-title">{{ headerTitle }}</h2>
        <button class="close-button" type="button" @click="closeModal">
          ×
        </button>
      </div>

      <div class="modal-body">
        <!-- Step 0: 設定 -->
        <template v-if="step === 0">
          <p v-if="source === 'schedule' && !hasClassDays" class="warning-msg">
            授業日がありません。スケジュールを生成してください。
          </p>
          <p
            v-else-if="source === 'calendar' && !hasEvents"
            class="warning-msg"
          >
            この年度のイベントがありません。
          </p>
          <template v-else>
            <!-- Schedule form -->
            <template v-if="source === 'schedule'">
              <div class="form-group">
                <label for="ics-subject"
                  >科目名<span class="required-mark">*</span></label
                >
                <input
                  ref="subjectInputRef"
                  id="ics-subject"
                  v-model="subjectName"
                  type="text"
                  class="form-control"
                  placeholder="例：財政学2"
                  @blur="onSubjectBlur"
                />
                <span v-if="validationError" class="validation-error">{{
                  validationError
                }}</span>
              </div>
              <div class="form-group">
                <label
                  >{{
                    isIntensiveSchedule
                      ? "授業の日付・時限・教室"
                      : "授業の時限・教室"
                  }}<span class="required-mark">*</span></label
                >
                <!-- 集中授業: 日付ごとにグループ表示 -->
                <template v-if="isIntensiveSchedule">
                  <div
                    v-for="group in intensiveSlotGroups"
                    :key="group.dateStr"
                    class="intensive-date-area"
                  >
                    <label class="intensive-date-label">{{
                      formatDateLabel(group.dateStr)
                    }}</label>
                    <div
                      v-for="idx in group.indices"
                      :key="idx"
                      class="slot-group"
                    >
                      <div v-if="slots[idx]" class="slot-row">
                        <template v-if="!isSlotOd(idx)">
                          <div class="period-select-group">
                            <label class="small-label">時限</label>
                            <select
                              v-model="slots[idx]!.period"
                              class="form-control period-select"
                              @change="onPeriodChange(slots[idx]!)"
                            >
                              <option
                                v-for="p in PERIOD_TIMES"
                                :key="p.period"
                                :value="p.period"
                              >
                                {{ p.label }}
                              </option>
                              <option :value="null">カスタム</option>
                            </select>
                          </div>
                          <template v-if="slots[idx]!.period === null">
                            <div class="custom-time-group">
                              <div class="time-input-group">
                                <label class="small-label">開始</label>
                                <input
                                  v-model="slots[idx]!.customStart"
                                  type="time"
                                  class="form-control time-input"
                                />
                              </div>
                              <div class="time-input-group">
                                <label class="small-label">終了</label>
                                <input
                                  v-model="slots[idx]!.customEnd"
                                  type="time"
                                  class="form-control time-input"
                                />
                              </div>
                            </div>
                          </template>
                          <div class="room-group">
                            <label class="small-label">教室</label>
                            <input
                              v-model="slots[idx]!.room"
                              type="text"
                              class="form-control room-input"
                              placeholder="例：有明4-301 / オンライン"
                            />
                          </div>
                        </template>
                        <template v-else>
                          <div
                            class="slot-od-add-switch slot-od-add-switch-intensive"
                          >
                            <span class="slot-od-add-switch-label"
                              >配信日をカレンダーに追加</span
                            >
                            <label class="toggle-switch">
                              <input
                                v-model="slots[idx]!.addToCalendar"
                                type="checkbox"
                                class="toggle-switch-input"
                              />
                              <span class="toggle-switch-slider"></span>
                            </label>
                          </div>
                          <div
                            v-if="slots[idx]!.addToCalendar !== false"
                            class="slot-row"
                          >
                            <div class="period-select-group">
                              <label class="small-label">配信時間</label>
                              <select
                                v-model="slots[idx]!.period"
                                class="form-control period-select"
                                @change="onPeriodChange(slots[idx]!)"
                              >
                                <option
                                  v-for="p in PERIOD_TIMES"
                                  :key="p.period"
                                  :value="p.period"
                                >
                                  {{ p.label }}
                                </option>
                                <option :value="null">カスタム</option>
                              </select>
                            </div>
                            <template v-if="slots[idx]!.period === null">
                              <div class="custom-time-group">
                                <div class="time-input-group">
                                  <label class="small-label">開始</label>
                                  <input
                                    v-model="slots[idx]!.customStart"
                                    type="time"
                                    class="form-control time-input"
                                  />
                                </div>
                                <div class="time-input-group">
                                  <label class="small-label">終了</label>
                                  <input
                                    v-model="slots[idx]!.customEnd"
                                    type="time"
                                    class="form-control time-input"
                                  />
                                </div>
                              </div>
                            </template>
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </template>
                <!-- 通常: 曜日ごと -->
                <template v-else>
                  <div
                    v-for="(slot, idx) in slots"
                    :key="idx"
                    class="slot-group"
                  >
                    <label class="slot-label">{{
                      dayNames[slot.dayOfWeek]
                    }}</label>
                    <!-- OD: 配信日をカレンダーに追加 と 配信時間 を一行に -->
                    <div v-if="isSlotOd(idx)" class="slot-od-one-row">
                      <div
                        class="slot-od-add-switch slot-od-add-switch-intensive"
                      >
                        <span class="slot-od-add-switch-label"
                          >配信日をカレンダーに追加</span
                        >
                        <label class="toggle-switch">
                          <input
                            v-model="slot.addToCalendar"
                            type="checkbox"
                            class="toggle-switch-input"
                          />
                          <span class="toggle-switch-slider"></span>
                        </label>
                      </div>
                      <template v-if="slot.addToCalendar !== false">
                        <div class="period-select-group">
                          <label class="small-label">配信時間</label>
                          <select
                            v-model="slot.period"
                            class="form-control period-select"
                            @change="onPeriodChange(slot)"
                          >
                            <option
                              v-for="p in PERIOD_TIMES"
                              :key="p.period"
                              :value="p.period"
                            >
                              {{ p.label }}
                            </option>
                            <option :value="null">カスタム</option>
                          </select>
                        </div>
                        <template v-if="slot.period === null">
                          <div class="custom-time-group">
                            <div class="time-input-group">
                              <label class="small-label">開始</label>
                              <input
                                v-model="slot.customStart"
                                type="time"
                                class="form-control time-input"
                              />
                            </div>
                            <div class="time-input-group">
                              <label class="small-label">終了</label>
                              <input
                                v-model="slot.customEnd"
                                type="time"
                                class="form-control time-input"
                              />
                            </div>
                          </div>
                        </template>
                      </template>
                    </div>
                    <div v-if="!isSlotOd(idx)" class="slot-row">
                      <!-- RT: 時限 -->
                      <div class="period-select-group">
                        <label class="small-label">時限</label>
                        <select
                          v-model="slot.period"
                          class="form-control period-select"
                          @change="onPeriodChange(slot)"
                        >
                          <option
                            v-for="p in PERIOD_TIMES"
                            :key="p.period"
                            :value="p.period"
                          >
                            {{ p.label }}
                          </option>
                          <option :value="null">カスタム</option>
                        </select>
                      </div>
                      <template v-if="slot.period === null">
                        <div class="custom-time-group">
                          <div class="time-input-group">
                            <label class="small-label">開始</label>
                            <input
                              v-model="slot.customStart"
                              type="time"
                              class="form-control time-input"
                            />
                          </div>
                          <div class="time-input-group">
                            <label class="small-label">終了</label>
                            <input
                              v-model="slot.customEnd"
                              type="time"
                              class="form-control time-input"
                            />
                          </div>
                        </div>
                      </template>
                      <div class="room-group">
                        <label class="small-label">教室</label>
                        <input
                          v-model="slot.room"
                          type="text"
                          class="form-control room-input"
                          placeholder="例：有明4-301 / オンライン"
                        />
                      </div>
                    </div>
                  </div>
                </template>
              </div>
              <section
                class="calendar-event-settings"
                aria-labelledby="calendar-event-settings-heading"
              >
                <div class="calendar-event-settings-inner">
                  <h3
                    id="calendar-event-settings-heading"
                    class="calendar-event-settings-heading"
                  >
                    カレンダーイベント設定
                  </h3>
                  <div
                    class="form-group add-delivery-to-summary-row slot-od-add-switch slot-od-add-switch-intensive"
                  >
                    <span class="slot-od-add-switch-label"
                      >タイトルに実施方法を追加</span
                    >
                    <label class="toggle-switch">
                      <input
                        v-model="addDeliveryToSummary"
                        type="checkbox"
                        class="toggle-switch-input"
                      />
                      <span class="toggle-switch-slider"></span>
                    </label>
                  </div>
                  <div class="form-group reminder-group">
                    <div class="reminder-row">
                      <div class="reminder-select-group">
                        <span class="reminder-label"
                          >リマインド 1回目（必須）</span
                        >
                        <select
                          v-model="reminder1Minutes"
                          class="form-control reminder-select"
                        >
                          <option
                            v-for="opt in reminderOptions"
                            :key="opt.value"
                            :value="opt.value"
                          >
                            {{ opt.label }}
                          </option>
                        </select>
                      </div>
                      <div class="reminder-select-group">
                        <span class="reminder-label"
                          >リマインド 2回目（任意）</span
                        >
                        <select
                          v-model="reminder2Minutes"
                          class="form-control reminder-select"
                        >
                          <option :value="null">なし</option>
                          <option
                            v-for="opt in reminderOptions"
                            :key="opt.value"
                            :value="opt.value"
                          >
                            {{ opt.label }}
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <textarea
                      id="ics-custom-memo"
                      v-model="customMemo"
                      class="form-control memo-textarea"
                      placeholder="カレンダーイベントに表示するメモ（空欄可）"
                      rows="3"
                    />
                  </div>
                </div>
              </section>
            </template>
            <!-- Calendar form -->
            <template v-else>
              <div class="form-group">
                <label>含める種別<span class="required-mark">*</span></label>
                <div class="checkbox-group">
                  <label
                    v-for="opt in typeOptions"
                    :key="opt.value"
                    class="checkbox-label"
                  >
                    <input
                      type="checkbox"
                      :value="opt.value"
                      v-model="includeTypes"
                    />
                    <span>{{ opt.label }}</span>
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>授業実施</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input
                      type="radio"
                      v-model="classesHeldFilter"
                      value="false"
                    />
                    <span>休講日のみ</span>
                  </label>
                  <label class="radio-label">
                    <input
                      type="radio"
                      v-model="classesHeldFilter"
                      value="both"
                    />
                    <span>すべて（休講日・授業日とも）</span>
                  </label>
                </div>
              </div>
              <div class="form-group">
                <select
                  v-model="reminderMinutes"
                  class="form-control reminder-select"
                >
                  <option
                    v-for="opt in calendarReminderOptions"
                    :key="opt.value ?? 'none'"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label for="calendar-custom-memo">メモ（任意）</label>
                <textarea
                  id="calendar-custom-memo"
                  v-model="calendarCustomMemo"
                  class="form-control memo-textarea"
                  placeholder="カレンダーイベントに表示するメモ（空欄可）"
                  rows="3"
                />
              </div>
              <p class="all-day-note">
                イベントはすべて「終日」として出力されます。
              </p>
            </template>
          </template>
        </template>

        <!-- Step 1: カレンダーの選択 -->
        <template v-else-if="step === 1">
          <p class="step-description">
            ご利用のカレンダーアプリを選択してください。
          </p>
          <div class="calendar-options">
            <button
              v-for="opt in calendarOptions"
              :key="opt.id"
              type="button"
              class="calendar-option-card"
              :class="{ selected: calendarTarget === opt.id }"
              @click="selectCalendar(opt.id)"
            >
              <span class="option-label">{{ opt.label }}</span>
            </button>
          </div>
        </template>

        <!-- Step 2: UA 判定とアクション -->
        <template v-else>
          <div class="env-hint">
            <span class="env-hint-label">環境:</span>
            <span class="env-hint-value">{{ envDisplayLabel }}</span>
          </div>
          <section class="summary" aria-label="設定概要">
            <h3 class="summary-heading">設定内容</h3>
            <dl class="summary-list" v-if="currentPayload">
              <template v-if="currentPayload.type === 'schedule'">
                <dt>種別</dt>
                <dd>科目（授業スケジュール）</dd>
                <dt>年度</dt>
                <dd>{{ currentPayload.year }}</dd>
                <dt>学期</dt>
                <dd>{{ currentPayload.semester }}</dd>
                <dt>科目名</dt>
                <dd>
                  {{ currentPayload.icsExportOptions.subjectName || "—" }}
                </dd>
                <dt>
                  {{
                    isIntensiveSchedule ||
                    (currentPayload as ScheduleIcsPayload).intensiveSchedule !=
                      null ||
                    currentPayload.icsExportOptions.slots?.[0]?.dateStr
                      ? "日付・時限・教室"
                      : "曜日・時限・教室"
                  }}
                </dt>
                <dd class="summary-slots">
                  <span
                    v-for="(slot, i) in currentPayload.icsExportOptions.slots"
                    :key="i"
                    class="slot-item"
                  >
                    {{ slotLabel(slot) }} {{ slotLocationDisplay(slot) }}
                  </span>
                  <span v-if="!currentPayload.icsExportOptions.slots?.length"
                    >—</span
                  >
                </dd>
                <dt>リマインド</dt>
                <dd>
                  {{
                    reminderLabel(
                      currentPayload.icsExportOptions.reminder1Minutes,
                      currentPayload.icsExportOptions.reminder2Minutes,
                    )
                  }}
                </dd>
                <template v-if="currentPayload.icsExportOptions.customMemo">
                  <dt>メモ</dt>
                  <dd class="summary-memo">
                    {{ currentPayload.icsExportOptions.customMemo }}
                  </dd>
                </template>
              </template>
              <template v-else>
                <dt>種別</dt>
                <dd>学年暦</dd>
                <dt>年度</dt>
                <dd>{{ currentPayload.year }}</dd>
                <dt>含める種別</dt>
                <dd>
                  {{
                    includeTypesLabel(
                      currentPayload.calendarIcsOptions.includeTypes,
                    )
                  }}
                </dd>
                <dt>授業実施</dt>
                <dd>
                  {{
                    currentPayload.calendarIcsOptions.classesHeldFilter ===
                    "false"
                      ? "休講日のみ"
                      : "両方"
                  }}
                </dd>
                <dt>リマインド</dt>
                <dd>
                  {{
                    reminderMinutesToLabel(
                      currentPayload.calendarIcsOptions.reminderMinutes,
                    )
                  }}
                </dd>
                <template v-if="currentPayload.calendarIcsOptions.customMemo">
                  <dt>メモ</dt>
                  <dd class="summary-memo">
                    {{ currentPayload.calendarIcsOptions.customMemo }}
                  </dd>
                </template>
              </template>
            </dl>
          </section>

          <div class="step2-content">
            <!-- iOS + Mac -->
            <template
              v-if="
                calendarTarget === 'apple' &&
                (effectiveEnv === 'mac' || effectiveEnv === 'mac_safari')
              "
            >
              <div class="action-row">
                <button
                  type="button"
                  class="btn-download"
                  @click="emitDownload"
                >
                  カレンダーファイルダウンロード
                </button>
              </div>
              <p class="action-desc">
                ダウンロードしたファイルをダブルクリックするだけで追加されます。
              </p>
            </template>
            <!-- iOS + Windows -->
            <template
              v-else-if="
                calendarTarget === 'apple' && effectiveEnv === 'windows'
              "
            >
              <div class="qr-block">
                <div class="qr-wrap" v-if="qrUrl">
                  <img
                    v-if="qrImageSrc"
                    :src="qrImageSrc"
                    alt="QRコード"
                    class="qr-image"
                  />
                  <p v-else-if="qrGenerateError" class="qr-error-msg">
                    QRコードを生成できませんでした（URLが長すぎます）。「URLをコピー」をご利用ください。
                  </p>
                </div>
                <button type="button" class="btn-copy" @click="copyUrl">
                  URLをコピー
                </button>
                <p class="action-desc">
                  iPhone/iPadでQRコードを読み取り、端末から直接追加してください。
                </p>
              </div>
            </template>
            <!-- iOS + Android -->
            <template
              v-else-if="
                calendarTarget === 'apple' && effectiveEnv === 'android'
              "
            >
              <p class="action-desc only-desc">
                Android端末からiOSカレンダーへの追加はできません。
              </p>
            </template>
            <!-- iOS + iOS Safari -->
            <template
              v-else-if="
                calendarTarget === 'apple' && effectiveEnv === 'ios_safari'
              "
            >
              <div class="action-row">
                <button
                  type="button"
                  class="btn-download"
                  @click="emitDownload"
                >
                  カレンダーに追加
                </button>
              </div>
              <p class="action-desc">
                タップした後、自動的にカレンダーが起動します。『すべて追加』をタップしてください。
              </p>
            </template>
            <!-- iOS + iOS 他 -->
            <template
              v-else-if="
                calendarTarget === 'apple' && effectiveEnv === 'ios_other'
              "
            >
              <div class="action-row">
                <button type="button" class="btn-copy" @click="copyUrl">
                  URLをコピー
                </button>
              </div>
              <p class="action-desc warning-desc">
                ⚠️
                現在のブラウザ（Chrome等）では直接追加できません。URLをコピーし、標準のSafariアプリに貼り付けて開いてください。
              </p>
            </template>
            <!-- Google + Mac/Windows -->
            <template
              v-else-if="
                calendarTarget === 'google' &&
                (effectiveEnv === 'mac' ||
                  effectiveEnv === 'mac_safari' ||
                  effectiveEnv === 'windows')
              "
            >
              <div class="action-row">
                <button
                  type="button"
                  class="btn-download"
                  @click="emitDownload"
                >
                  カレンダーファイルダウンロード
                </button>
              </div>
              <p class="action-desc">
                Googleカレンダー Web → 右上の⚙️ → 設定 →
                インポートとエクスポート
              </p>
              <button
                type="button"
                class="btn-link"
                @click="showAndroidGoogleHelp = !showAndroidGoogleHelp"
              >
                Android スマホで追加する手順を見る
              </button>
              <div v-if="showAndroidGoogleHelp" class="qr-block">
                <div class="qr-wrap" v-if="qrUrl">
                  <img
                    v-if="qrImageSrc"
                    :src="qrImageSrc"
                    alt="QRコード"
                    class="qr-image"
                  />
                  <p v-else-if="qrGenerateError" class="qr-error-msg">
                    QRコードを生成できませんでした（URLが長すぎます）。「URLをコピー」をご利用ください。
                  </p>
                </div>
                <button type="button" class="btn-copy" @click="copyUrl">
                  URLをコピー
                </button>
                <p class="action-desc">
                  Android
                  スマホでQRコードを読み取り、端末から直接追加してください。
                </p>
              </div>
            </template>
            <!-- Google + iOS -->
            <template
              v-else-if="
                calendarTarget === 'google' &&
                (effectiveEnv === 'ios_safari' || effectiveEnv === 'ios_other')
              "
            >
              <p class="action-desc only-desc">
                iPhone/iPadからGoogleカレンダーへ直接追加することは推奨されていません。パソコンから操作してください。
              </p>
            </template>
            <!-- Google + Android -->
            <template
              v-else-if="
                calendarTarget === 'google' && effectiveEnv === 'android'
              "
            >
              <div class="action-row">
                <button
                  type="button"
                  class="btn-download"
                  @click="emitDownload"
                >
                  カレンダーファイルダウンロード
                </button>
              </div>
              <p class="action-desc">
                通知領域よりダウンロードの通知をタップし、「カレンダーで開く」を選択して予定を追加してください。
              </p>
            </template>
            <!-- Outlook + Mac/Windows -->
            <template
              v-else-if="
                calendarTarget === 'outlook' &&
                (effectiveEnv === 'mac' ||
                  effectiveEnv === 'mac_safari' ||
                  effectiveEnv === 'windows')
              "
            >
              <div class="action-row">
                <button
                  type="button"
                  class="btn-download"
                  @click="emitDownload"
                >
                  カレンダーファイルダウンロード
                </button>
              </div>
              <p class="action-desc">
                ダウンロードしたファイルをダブルクリックして、Outlookに追加してください。
              </p>
            </template>
            <!-- Outlook + iOS/Android -->
            <template
              v-else-if="
                calendarTarget === 'outlook' &&
                (effectiveEnv === 'ios_safari' ||
                  effectiveEnv === 'ios_other' ||
                  effectiveEnv === 'android')
              "
            >
              <p class="action-desc only-desc">
                スマホ/タブレット端末からOutlookへ直接追加することは推奨されていません。パソコンから操作してください。
              </p>
            </template>
            <!-- その他 + 全環境 -->
            <template v-else-if="calendarTarget === 'other'">
              <div class="action-row">
                <button
                  type="button"
                  class="btn-download"
                  @click="emitDownload"
                >
                  ダウンロード
                </button>
              </div>
              <p class="action-desc">
                ダウンロードしたカレンダーファイルを、カレンダーアプリにインポートしてください。
              </p>
            </template>
            <!-- Fallback (other env) -->
            <template v-else>
              <div class="action-row">
                <button
                  type="button"
                  class="btn-download"
                  @click="emitDownload"
                >
                  ダウンロード
                </button>
              </div>
            </template>
          </div>
        </template>
      </div>

      <div class="modal-footer">
        <template v-if="step === 0">
          <button type="button" class="btn-cancel" @click="closeModal">
            キャンセル
          </button>
          <button
            type="button"
            class="btn-next"
            :disabled="!canProceedFromStep0"
            @click="goToStep1"
          >
            次へ
          </button>
        </template>
        <template v-else-if="step === 1">
          <button type="button" class="btn-next" @click="goToStep2">
            次へ
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import type {
  ScheduleItem,
  SemesterOption,
  CourseDays,
  ClassesPerWeek,
  DayOfWeek,
  IcsSlot,
  IcsExportOptions,
  DeliveryMode,
  CalendarEvent,
  CalendarEventType,
  CalendarEventsIcsOptions,
} from "../types";
import type {
  ScheduleIcsPayload,
  CalendarIcsPayload,
  IcsPayload,
} from "../utils/icsPayload";
import { PERIOD_TIMES } from "../utils/periodTimes";
import { PERIOD_TIMES_MAP } from "../utils/periodTimes";
import { encodePayload } from "../utils/icsPayload";
import { getUA } from "../utils/uaDetection";
import QRCode from "qrcode";

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const DAY_NAMES_FULL = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

const typeOptions: { value: CalendarEventType; label: string }[] = [
  { value: "national_holiday", label: "国民の祝日" },
  { value: "school_holiday", label: "学校休業" },
  { value: "academic", label: "学務（試験・補講等）" },
  { value: "event", label: "行事" },
  { value: "vacation", label: "長期休暇" },
];

const reminderOptions = [
  { value: 5, label: "5分前" },
  { value: 15, label: "15分前" },
  { value: 30, label: "30分前" },
  { value: 60, label: "1時間前" },
  { value: 120, label: "2時間前" },
  { value: 1440, label: "1日前" },
  { value: 2880, label: "2日前" },
];

/** 学年暦（終日イベント）用：なし・1日前・2日前のみ */
const calendarReminderOptions = [
  { value: null as number | null, label: "なし" },
  { value: 1440, label: "1日前" },
  { value: 2880, label: "2日前" },
];

const calendarOptions = [
  { id: "apple" as const, label: "iOSカレンダー（iPhone, Macなど）" },
  { id: "google" as const, label: "Google カレンダー" },
  { id: "outlook" as const, label: "Outlook カレンダー" },
  { id: "other" as const, label: "その他（.icsファイルを直接ダウンロード）" },
];

const props = withDefaults(
  defineProps<{
    visible: boolean;
    source: "schedule" | "calendar";
    // schedule props
    schedule?: ScheduleItem[];
    semester?: SemesterOption;
    year?: number;
    courseDays?: CourseDays;
    classesPerWeek?: ClassesPerWeek;
    classSlots?: import("../types").ClassSlot[];
    /** 集中授業モード（スロットを日付ごとに1件ずつ表示） */
    isIntensiveSchedule?: boolean;
    initialSubjectName?: string;
    initialIcsOptions?: IcsExportOptions;
    // calendar props
    events?: CalendarEvent[];
    initialCalendarIcsOptions?: CalendarEventsIcsOptions | null;
    // URL open
    initialStep?: number;
    initialCalendarTarget?: "apple" | "google" | "outlook" | "other";
    initialPayload?: IcsPayload | null;
  }>(),
  {
    schedule: () => [],
    semester: "前期",
    year: 0,
    courseDays: 14,
    classesPerWeek: 1,
    classSlots: () => [],
    isIntensiveSchedule: false,
    events: () => [],
    initialStep: 0,
    initialCalendarTarget: undefined,
    initialPayload: null,
  },
);

const emit = defineEmits<{
  close: [];
  "download-ics": [payload: IcsPayload];
}>();

const step = ref(0);
const calendarTarget = ref<"apple" | "google" | "outlook" | "other">("apple");
const showAndroidGoogleHelp = ref(false);
const subjectInputRef = ref<HTMLInputElement | null>(null);

// Schedule form state
const subjectName = ref("");
const slots = ref<IcsSlot[]>([]);
const reminder1Minutes = ref<number>(1440);
const reminder2Minutes = ref<number | null>(null);
/** タイトル（SUMMARY）に実施形態を追加するか。デフォルトはスロットが全て同一形態なら false、混在なら true */
const addDeliveryToSummary = ref(false);
const customMemo = ref("");
const validationError = ref("");

// Calendar form state
const includeTypes = ref<CalendarEventType[]>([
  ...typeOptions.map((o) => o.value),
]);
const classesHeldFilter = ref<"false" | "both">("false");
const reminderMinutes = ref<number | null>(null);
const calendarCustomMemo = ref("");

// Cached payload when moving from step 0 to 1 (or from URL)
const savedPayload = ref<IcsPayload | null>(null);
const qrImageSrc = ref("");
/** QR 生成失敗（URL が長すぎる等）時に true。表示で「URLをコピー」を案内する */
const qrGenerateError = ref(false);

const dayNames = DAY_NAMES_FULL;
const hasClassDays = computed(() =>
  props.schedule.some((item) => !item.isHoliday),
);
const hasEvents = computed(() => (props.events?.length ?? 0) > 0);

const canGoBackFromStep2 = computed(
  () => props.initialStep === 2 && props.initialPayload != null,
);

const currentPayload = computed(() => {
  if (savedPayload.value) return savedPayload.value;
  return props.initialPayload;
});

const canProceedFromStep0 = computed(() => {
  if (props.source === "schedule") {
    if (!hasClassDays.value) return false;
    for (const slot of slots.value) {
      if (slot.period === null) {
        if (!slot.customStart || !slot.customEnd) return false;
      }
    }
    return true;
  } else {
    return hasEvents.value && includeTypes.value.length > 0;
  }
});

const headerTitle = computed(() => {
  if (step.value === 0) return "カレンダーに追加";
  if (step.value === 1) return "カレンダーの選択";
  return "カレンダーに追加";
});

const ua = computed(() => getUA());
const envDisplayLabel = computed(() => {
  const e = ua.value;
  const labels: Record<string, string> = {
    mac: "Mac",
    windows: "Windows",
    ios: "iOS",
    android: "Android",
    other: "その他",
    safari: "Safari",
    chrome: "Chrome",
  };
  return `${labels[e.os] ?? e.os} + ${labels[e.browser] ?? e.browser}`;
});

const effectiveEnv = computed(() => {
  const e = ua.value;
  if (e.os === "mac") return e.browser === "safari" ? "mac_safari" : "mac";
  if (e.os === "windows") return "windows";
  if (e.os === "android") return "android";
  if (e.os === "ios") {
    return e.browser === "safari" ? "ios_safari" : "ios_other";
  }
  return "other";
});

const qrUrl = computed(() => {
  const p = currentPayload.value;
  if (!p) return "";
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const encoded = encodePayload(p);
  return (
    window.location.origin +
    base +
    "/?action=calendar_modal&target=" +
    calendarTarget.value +
    "&q=" +
    encoded
  );
});

function slotLabel(slot: IcsSlot): string {
  const fromMap =
    slot.period != null ? PERIOD_TIMES_MAP[slot.period] : undefined;
  const start = fromMap?.start ?? slot.customStart ?? "09:00";
  const end = fromMap?.end ?? slot.customEnd ?? "10:30";
  const periodStr = slot.period != null ? `${slot.period}限` : "カスタム";
  const dateOrDay =
    slot.dateStr != null && slot.dateStr !== ""
      ? formatDateLabel(slot.dateStr)
      : DAY_NAMES[slot.dayOfWeek];
  const sep = slot.dateStr != null && slot.dateStr !== "" ? " " : "";
  return `${dateOrDay}${sep}${periodStr}（${start}～${end}）`;
}

/** 設定内容・曜日・時限・教室の「教室」表示（LOCATION と同一ロジック） */
function slotLocationDisplay(slot: IcsSlot): string {
  const mode = slot.deliveryType;
  const room = (slot.room ?? "").trim();
  if (mode === "on-demand") return "オンデマンド";
  if (mode === "face-to-face") return room;
  if (mode === "online") return room || "オンライン";
  return room || "";
}

/** 全スロットの実施形態が同一なら true（0 or 1 件も true）。addDeliveryToSummary のデフォルト算出用 */
function allSameDeliveryType(slots: IcsSlot[]): boolean {
  if (slots.length <= 1) return true;
  const first = slots[0]?.deliveryType;
  return slots.every((s) => s.deliveryType === first);
}

function reminderMinutesToLabel(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return "なし";
  const opt = reminderOptions.find((o) => o.value === minutes);
  return opt?.label ?? `${minutes}分前`;
}

function reminderLabel(r1: number, r2?: number | null): string {
  const parts: string[] = [];
  if (r1 != null && r1 > 0) parts.push(reminderMinutesToLabel(r1));
  if (r2 != null && r2 > 0) parts.push(reminderMinutesToLabel(r2));
  return parts.length ? parts.join("、") : "なし";
}

const CALENDAR_EVENT_TYPE_LABELS: Record<string, string> = {
  national_holiday: "祝日",
  school_holiday: "休業日",
  academic: "学務",
  event: "行事",
  vacation: "長期休暇",
};

function includeTypesLabel(types: string[]): string {
  if (!types?.length) return "—";
  return types.map((t) => CALENDAR_EVENT_TYPE_LABELS[t] ?? t).join("、");
}

function isSlotOd(slotIndex: number): boolean {
  if (props.isIntensiveSchedule) {
    const slot = slots.value[slotIndex];
    return slot != null && slot.addToCalendar !== undefined;
  }
  const cs = props.classSlots ?? [];
  const s = cs[slotIndex];
  return s?.deliveryType === "on-demand";
}

/** 集中授業: 日付ラベル（例: 2026/8/5）。YYYY-MM-DD または「2026年08月18日（火）」形式を短い y/m/d に */
function formatDateLabel(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return "—";
  const trimmed = dateStr.trim();
  const isoParts = trimmed.split("-");
  if (isoParts.length === 3) {
    const y = Number(isoParts[0]);
    const m = Number(isoParts[1]);
    const d = Number(isoParts[2]);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d))
      return `${y}/${m}/${d}`;
  }
  const jpMatch = /^(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(trimmed);
  if (jpMatch) {
    const y = Number(jpMatch[1]);
    const m = Number(jpMatch[2]);
    const d = Number(jpMatch[3]);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d))
      return `${y}/${m}/${d}`;
  }
  return trimmed;
}

/** 集中授業: スロットを日付ごとにグループ化 */
const intensiveSlotGroups = computed(() => {
  const list: { dateStr: string; indices: number[] }[] = [];
  const byDate = new Map<string, number[]>();
  slots.value.forEach((slot, idx) => {
    const d = slot.dateStr ?? "";
    if (!d) return;
    const arr = byDate.get(d) ?? [];
    arr.push(idx);
    byDate.set(d, arr);
  });
  const sorted = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([dateStr, indices]) => ({ dateStr, indices }));
});

function initSlots() {
  if (props.isIntensiveSchedule && props.schedule?.length) {
    const items = props.schedule.filter((item) => !item.isHoliday);
    slots.value = items.map((item) => ({
      dayOfWeek: 0 as import("../types").DayOfWeek,
      dateStr: item.dateStr,
      period: (item.period ?? 1) as IcsSlot["period"],
      room: item.deliveryMode === "online" ? "オンライン" : "",
      deliveryType: item.deliveryMode,
      addToCalendar: item.deliveryMode === "on-demand" ? true : undefined,
    }));
    return;
  }
  const cs = props.classSlots ?? [];
  slots.value = cs.map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    period: (slot.period ?? 1) as IcsSlot["period"],
    room: slot.deliveryType === "online" ? "オンライン" : "",
    deliveryType: slot.deliveryType,
    addToCalendar: slot.deliveryType === "on-demand" ? true : undefined,
  }));
}

function onPeriodChange(slot: IcsSlot) {
  if (slot.period !== null) {
    slot.customStart = undefined;
    slot.customEnd = undefined;
  }
}

function onSubjectBlur() {
  const name = subjectName.value.trim();
  if (!name) {
    validationError.value = "科目名を入力してください。";
  } else {
    validationError.value = "";
  }
}

function validate(): boolean {
  validationError.value = "";
  const name = subjectName.value.trim();
  if (!name) {
    validationError.value = "科目名を入力してください。";
    return false;
  }
  for (const slot of slots.value) {
    if (slot.period === null) {
      if (!slot.customStart || !slot.customEnd) {
        validationError.value =
          "カスタム時間の場合は開始・終了を入力してください。";
        return false;
      }
    }
  }
  return true;
}

function buildPayload(): IcsPayload | null {
  if (props.source === "schedule") {
    if (!hasClassDays.value || !validate()) return null;
    const y = props.year ?? 0;
    const courseDays = props.courseDays ?? 14;
    const classesPerWeek = (props.classesPerWeek ?? 1) as 1 | 2;
    const classSlots = props.classSlots ?? [];
    const icsExportOptions: IcsExportOptions = {
      subjectName: subjectName.value.trim(),
      slots: slots.value.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        period: s.period,
        customStart: s.customStart,
        customEnd: s.customEnd,
        room: s.room.trim(),
        deliveryType: s.deliveryType,
        addToCalendar: s.addToCalendar,
        dateStr: s.dateStr,
      })),
      reminder1Minutes: reminder1Minutes.value,
      reminder2Minutes: reminder2Minutes.value ?? undefined,
      addDeliveryToSummary: addDeliveryToSummary.value,
      customMemo: customMemo.value.trim() || undefined,
    };
    const base: ScheduleIcsPayload = {
      type: "schedule",
      year: y,
      semester: props.semester ?? "前期",
      courseDays,
      classesPerWeek,
      classSlots,
      icsExportOptions,
    };
    if (props.isIntensiveSchedule && props.schedule?.length) {
      base.intensiveSchedule = props.schedule;
    }
    return base;
  } else {
    if (!hasEvents.value || includeTypes.value.length === 0) return null;
    const y = props.year ?? 0;
    const calendarIcsOptions: CalendarEventsIcsOptions = {
      includeTypes: [...includeTypes.value],
      classesHeldFilter: classesHeldFilter.value,
      reminderMinutes: reminderMinutes.value ?? undefined,
      customMemo: calendarCustomMemo.value.trim() || undefined,
    };
    return {
      type: "calendar",
      year: y,
      calendarIcsOptions,
    } as CalendarIcsPayload;
  }
}

function closeModal() {
  validationError.value = "";
  showAndroidGoogleHelp.value = false;
  emit("close");
}

function goBack() {
  if (step.value === 1) {
    step.value = 0;
  } else if (step.value === 2) {
    if (canGoBackFromStep2.value) return;
    step.value = 1;
  }
}

function selectCalendar(id: "apple" | "google" | "outlook" | "other") {
  calendarTarget.value = id;
}

function goToStep1() {
  if (props.source === "schedule" && !validate()) return;
  const p = buildPayload();
  if (!p) return;
  savedPayload.value = p;
  step.value = 1;
}

function goToStep2() {
  step.value = 2;
  qrImageSrc.value = "";
  qrGenerateError.value = false;
  if (qrUrl.value) {
    QRCode.toDataURL(qrUrl.value, { width: 256 }, (err, url) => {
      if (!err && url) {
        qrImageSrc.value = url;
      } else {
        qrGenerateError.value = true;
      }
    });
  }
}

function emitDownload() {
  const p = currentPayload.value;
  if (p) emit("download-ics", p);
}

function copyUrl() {
  if (!qrUrl.value) return;
  navigator.clipboard.writeText(qrUrl.value).catch(() => {});
}

watch(
  () =>
    [
      props.visible,
      props.initialStep,
      props.initialPayload,
      props.initialCalendarTarget,
    ] as const,
  ([visible, initStep, initPayload, initTarget]) => {
    if (visible) {
      if (initStep === 2 && initPayload && initTarget) {
        step.value = 2;
        savedPayload.value = initPayload;
        calendarTarget.value = initTarget;
        qrImageSrc.value = "";
        qrGenerateError.value = false;
        nextTick(() => {
          const urlToEncode = qrUrl.value;
          if (urlToEncode) {
            QRCode.toDataURL(urlToEncode, { width: 256 }, (err, url) => {
              if (!err && url) {
                qrImageSrc.value = url;
              } else {
                qrGenerateError.value = true;
              }
            });
          }
        });
      } else {
        step.value = 0;
        savedPayload.value = null;
        calendarTarget.value = "apple";
        qrImageSrc.value = "";
        qrGenerateError.value = false;
      }
    }
  },
);

watch(
  () => [props.visible, props.source, step.value] as const,
  async ([visible, src, s]) => {
    if (visible && src === "schedule" && s === 0) {
      await nextTick();
      subjectInputRef.value?.focus();
    }
  },
);

watch(
  () =>
    [
      props.visible,
      props.source,
      props.classSlots,
      props.isIntensiveSchedule,
      props.schedule,
    ] as const,
  ([visible, src, classSlots, isIntensive, schedule]) => {
    if (visible) {
      if (src === "schedule") {
        const opts = props.initialIcsOptions;
        const hasIntensiveOpts =
          opts?.slots?.length && opts.slots.some((s) => s.dateStr != null);
        if (
          opts &&
          (isIntensive ? hasIntensiveOpts : Array.isArray(classSlots))
        ) {
          subjectName.value = opts.subjectName ?? "";
          if (isIntensive && hasIntensiveOpts) {
            slots.value = opts.slots.map((s) => ({
              ...s,
              dayOfWeek: (s.dayOfWeek ?? 0) as import("../types").DayOfWeek,
              room: s.room ?? "",
              period: s.period ?? (1 as IcsSlot["period"]),
              addToCalendar: s.addToCalendar !== false,
            }));
          } else if (!isIntensive && Array.isArray(classSlots)) {
            const cs = props.classSlots ?? [];
            slots.value = opts.slots.map((s, i) => {
              const od = cs[i]?.deliveryType === "on-demand";
              const period =
                s.period != null
                  ? s.period
                  : od && (s as { odAllDay?: boolean }).odAllDay === false
                    ? null
                    : (1 as IcsSlot["period"]);
              return {
                ...s,
                room: s.room ?? "",
                period,
                addToCalendar: od ? s.addToCalendar !== false : s.addToCalendar,
              };
            });
          }
          reminder1Minutes.value = opts.reminder1Minutes ?? 1440;
          reminder2Minutes.value = opts.reminder2Minutes ?? null;
          addDeliveryToSummary.value =
            opts.addDeliveryToSummary ?? !allSameDeliveryType(slots.value);
          customMemo.value = opts.customMemo ?? "";
        } else {
          initSlots();
          subjectName.value = props.initialSubjectName?.trim() ?? "";
          reminder1Minutes.value = 1440;
          reminder2Minutes.value = null;
          addDeliveryToSummary.value = !allSameDeliveryType(slots.value);
          customMemo.value = "";
          if (isIntensive && opts?.slots?.length && slots.value.length) {
            const optsSlots = opts.slots.filter((s) => s.dateStr != null);
            const byDate = new Map<string, number[]>();
            slots.value.forEach((s, i) => {
              if (s.dateStr) {
                const arr = byDate.get(s.dateStr) ?? [];
                arr.push(i);
                byDate.set(s.dateStr, arr);
              }
            });
            byDate.forEach((indices, dateStr) => {
              const optsForDate = optsSlots.filter(
                (s) => s.dateStr === dateStr,
              );
              indices.forEach((idx, p) => {
                const from = optsForDate[p];
                if (from && slots.value[idx]) {
                  slots.value[idx]!.room = from.room ?? slots.value[idx]!.room;
                  slots.value[idx]!.period =
                    from.period ?? slots.value[idx]!.period;
                  slots.value[idx]!.addToCalendar =
                    from.addToCalendar !== false;
                  if (from.customStart != null)
                    slots.value[idx]!.customStart = from.customStart;
                  if (from.customEnd != null)
                    slots.value[idx]!.customEnd = from.customEnd;
                }
              });
            });
            subjectName.value = opts.subjectName ?? subjectName.value;
            reminder1Minutes.value = opts.reminder1Minutes ?? 1440;
            reminder2Minutes.value = opts.reminder2Minutes ?? null;
            addDeliveryToSummary.value =
              opts.addDeliveryToSummary ?? !allSameDeliveryType(slots.value);
            customMemo.value = opts.customMemo ?? "";
          }
        }
        validationError.value = "";
      } else if (src === "calendar") {
        const opts = props.initialCalendarIcsOptions;
        if (opts) {
          includeTypes.value = [...opts.includeTypes];
          classesHeldFilter.value = opts.classesHeldFilter;
          reminderMinutes.value = opts.reminderMinutes ?? null;
          calendarCustomMemo.value = opts.customMemo ?? "";
        } else {
          includeTypes.value = [...typeOptions.map((o) => o.value)];
          classesHeldFilter.value = "false";
          reminderMinutes.value = null;
          calendarCustomMemo.value = "";
        }
      }
    }
  },
);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header .back-button {
  background: none;
  border: none;
  font-size: 14px;
  color: #0066cc;
  cursor: pointer;
  padding: 0 8px;
}

.modal-header .back-button:hover {
  text-decoration: underline;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  color: #333;
  flex: 1;
  text-align: center;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  padding: 0 4px;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.warning-msg {
  color: #c62828;
  margin: 0;
}

.form-group {
  margin-bottom: 18px;
}

.form-group > label {
  display: block;
  font-weight: bold;
  margin-bottom: 6px;
  color: #333;
  font-size: 13px;
}

.required-mark {
  color: #c62828;
  margin-left: 2px;
}

.form-group .small-label {
  font-weight: normal;
  color: #666;
  font-size: 11px;
}

.form-control {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
  height: 38px;
}

.validation-error {
  display: block;
  color: #c62828;
  font-size: 12px;
  margin-top: 4px;
}

.slot-group {
  margin-bottom: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
}

.intensive-date-area {
  margin-bottom: 16px;
  padding: 12px;
  background: #f0f4f8;
  border-radius: 8px;
  border: 1px solid #e0e6ed;
}
.intensive-date-label {
  display: block;
  font-weight: bold;
  font-size: 13px;
  color: #333;
  margin-bottom: 10px;
}
.slot-label {
  font-weight: bold;
  font-size: 13px;
  color: #333;
  margin-bottom: 8px;
  display: block;
}

/* 通常授業 OD: 配信日をカレンダーに追加 と 配信時間 を一行に */
.slot-od-one-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 8px;
}

.slot-od-one-row .slot-od-add-switch {
  margin-bottom: 6px;
}

.slot-od-one-row .slot-od-add-switch-intensive {
  margin-bottom: 6px;
}

.slot-od-add-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.slot-od-add-switch .switch-label {
  font-size: 13px;
  color: #333;
}

/* 集中授業: 上下配置・ラベルは小さくグレー・左揃え */
.slot-od-add-switch-intensive {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 6px;
}

.slot-od-add-switch-intensive .slot-od-add-switch-label {
  font-size: 11px;
  color: #666;
  margin-bottom: 7px;
}

.slot-od-add-switch .toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.slot-od-add-switch .toggle-switch-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slot-od-add-switch .toggle-switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #ccc;
  border-radius: 22px;
  transition: background-color 0.2s;
}

.slot-od-add-switch .toggle-switch-slider::before {
  content: "";
  position: absolute;
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slot-od-add-switch .toggle-switch-input:checked + .toggle-switch-slider {
  background-color: #0066cc;
}

.slot-od-add-switch
  .toggle-switch-input:checked
  + .toggle-switch-slider::before {
  transform: translateX(18px);
}

.slot-od-add-switch .toggle-switch-input:focus-visible + .toggle-switch-slider {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

.slot-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.period-select-group {
  flex: 0 0 140px;
}

.custom-time-group {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.time-input-group {
  flex: 0 0 110px;
}

.room-group {
  flex: 1 1 180px;
  min-width: 0;
}

.calendar-event-settings {
  margin-top: 20px;
}

.calendar-event-settings-inner {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
}

.calendar-event-settings-heading {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.calendar-event-settings .reminder-group {
  margin-top: 0;
}

.reminder-group {
  margin-top: 20px;
}

.memo-textarea {
  resize: vertical;
  min-height: 60px;
}

.summary-memo {
  white-space: pre-wrap;
  word-break: break-word;
}

.reminder-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.reminder-select-group {
  flex: 1;
  min-width: 140px;
}

.reminder-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
}

.all-day-note {
  font-size: 12px;
  color: #666;
  margin: 8px 0 0 0;
}

.step-description {
  font-size: 14px;
  color: #555;
  margin: 0 0 16px 0;
}

.calendar-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calendar-option-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  text-align: left;
}

.calendar-option-card:hover {
  border-color: #0066cc;
  background: #f8faff;
}

.calendar-option-card.selected {
  border-color: #0066cc;
  background: #e8f0fe;
}

.option-label {
  font-weight: 600;
}

.option-hint {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.summary {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.summary-heading {
  font-size: 14px;
  margin: 0 0 12px 0;
  color: #333;
}

.summary-list {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  font-size: 13px;
}

.summary-list dt {
  color: #666;
  font-weight: normal;
}

.summary-list dd {
  margin: 0;
  color: #333;
}

.summary-slots {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-slots .slot-item {
  display: block;
}

.step2-content {
  margin-top: 8px;
}

.env-hint {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.env-hint-label {
  flex-shrink: 0;
}

.env-hint-value {
  color: #666;
}

.action-row {
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
}

.qr-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qr-block .action-desc {
  text-align: center;
  margin: 0;
}

.qr-wrap {
  background: #fff;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #eee;
}

.qr-image {
  display: block;
  width: 200px;
  height: 200px;
}

.qr-error-msg {
  width: 200px;
  min-height: 80px;
  margin: 0;
  padding: 12px;
  font-size: 12px;
  color: #b45309;
  line-height: 1.4;
  box-sizing: border-box;
}

.action-desc {
  font-size: 13px;
  color: #555;
  margin: 0 0 12px 0;
}

.action-desc.only-desc {
  margin-bottom: 0;
}

.action-desc.warning-desc {
  color: #b45309;
}

.btn-download {
  padding: 10px 20px;
  background: #0066cc;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.btn-download:hover {
  background: #0052a3;
}

.btn-copy {
  padding: 10px 20px;
  background: #fff;
  color: #0066cc;
  border: 2px solid #0066cc;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.btn-copy:hover {
  background: #e8f0fe;
}

.btn-link {
  padding: 0;
  background: none;
  border: none;
  color: #0066cc;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
  margin-bottom: 8px;
}

.btn-link:hover {
  color: #0052a3;
}

.help-expanded {
  margin-top: 8px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
  color: #555;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-next {
  padding: 8px 20px;
  border: none;
  background: #0066cc;
  color: #fff;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.btn-next:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-next:hover:not(:disabled) {
  background: #0052a3;
}
</style>
