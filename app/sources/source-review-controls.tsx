"use client";

import { useState } from "react";
import type { SourceReviewStatus } from "@/lib/source-reviews";

type SourceReviewControlsProps = {
  linkId: string;
  initialStatus: SourceReviewStatus;
  initialNote: string;
};

const statusOptions = [
  { value: "auto", label: "자동" },
  { value: "reviewed", label: "확정" },
  { value: "rejected", label: "제외" },
] as const satisfies readonly {
  value: SourceReviewStatus;
  label: string;
}[];

export default function SourceReviewControls({
  linkId,
  initialStatus,
  initialNote,
}: SourceReviewControlsProps) {
  const [status, setStatus] = useState<SourceReviewStatus>(initialStatus);
  const [note, setNote] = useState(initialNote);
  const [saveLabel, setSaveLabel] = useState(
    initialNote ? "검수 메모 불러옴" : "검수 대기",
  );

  async function saveReview(nextStatus = status, nextNote = note) {
    setSaveLabel("저장 중");

    const response = await fetch(`/api/source-links/${linkId}/review`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reviewStatus: nextStatus,
        note: nextNote,
      }),
    });

    if (response.ok) {
      setSaveLabel(`${formatTime()} 저장`);
      return;
    }

    if (response.status === 503) {
      setSaveLabel("DB 미설정");
      return;
    }

    setSaveLabel("저장 실패");
  }

  return (
    <div className="review-controls">
      <div className="review-button-group" aria-label="검수 상태">
        {statusOptions.map((option) => (
          <button
            className={option.value === status ? "active" : ""}
            key={option.value}
            type="button"
            onClick={() => {
              setStatus(option.value);
              void saveReview(option.value, note);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="review-note-field">
        <span>검수 메모</span>
        <textarea
          value={note}
          rows={3}
          onBlur={() => void saveReview(status, note)}
          onChange={(event) => setNote(event.target.value)}
          placeholder="연결 판단 근거, 제외 사유, 추가 확인할 점"
        />
      </label>
      <span className="review-save-state">{saveLabel}</span>
    </div>
  );
}

function formatTime() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
