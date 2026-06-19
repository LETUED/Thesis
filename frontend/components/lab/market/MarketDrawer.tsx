"use client";

import { useEffect, useState } from "react";
import { X, Download, Store, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageGraph } from "@/lib/lab/persistence";
import {
  listTemplates,
  publishTemplate,
  bumpTemplateImport,
  type TemplateRow,
} from "@/lib/lab/marketplace";

export function MarketDrawer({
  open,
  onClose,
  getCurrentPage,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  getCurrentPage: () => PageGraph;
  onImport: (page: PageGraph) => void;
}) {
  const [tab, setTab] = useState<"browse" | "publish">("browse");
  const [items, setItems] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setItems(await listTemplates());
    setLoading(false);
  }

  useEffect(() => {
    if (open) {
      setTab("browse");
      setNotice(null);
      void refresh();
    }
  }, [open]);

  if (!open) return null;

  function handleImport(t: TemplateRow) {
    onImport(t.graph);
    void bumpTemplateImport(t.id);
    setNotice(`"${t.title}"의 블록을 현재 페이지로 가져왔어요.`);
  }

  async function handlePublish() {
    const page = getCurrentPage();
    if (!title.trim()) {
      setNotice("제목을 입력해 주세요.");
      return;
    }
    if (page.metrics.length === 0) {
      setNotice("공유할 블록이 없어요. 캔버스에 블록을 먼저 놓아주세요.");
      return;
    }
    setPublishing(true);
    const ok = await publishTemplate(title.trim(), desc.trim(), page);
    setPublishing(false);
    if (ok) {
      setTitle("");
      setDesc("");
      setNotice("공유했어요!");
      setTab("browse");
      void refresh();
    } else {
      setNotice("공유에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex justify-end">
      <div className="flex-1 bg-background/40 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 font-semibold">
            <Store className="h-4 w-4 text-regime-on" aria-hidden />
            템플릿 마켓
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex gap-1 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setTab("browse")}
            className={
              "rounded-md px-3 py-1.5 text-sm " +
              (tab === "browse"
                ? "bg-regime-on/15 font-medium text-foreground"
                : "text-muted-foreground hover:bg-surface-2")
            }
          >
            둘러보기
          </button>
          <button
            type="button"
            onClick={() => setTab("publish")}
            className={
              "rounded-md px-3 py-1.5 text-sm " +
              (tab === "publish"
                ? "bg-regime-on/15 font-medium text-foreground"
                : "text-muted-foreground hover:bg-surface-2")
            }
          >
            현재 페이지 공유
          </button>
        </div>

        {notice ? (
          <p className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            {notice}
          </p>
        ) : null}

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "browse" ? (
            <>
              <p className="mb-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                사용자가 만든 템플릿이에요. 검증된 분석이 아니니, 가져온 뒤 근거는
                직접 확인하세요.
              </p>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                </div>
              ) : items.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  아직 공유된 템플릿이 없어요. 첫 템플릿을 공유해 보세요.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {items.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-border bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{t.title}</p>
                          {t.description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {t.description}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            블록 {t.graph?.metrics?.length ?? 0}개 · 가져오기{" "}
                            {t.import_count}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5"
                          onClick={() => handleImport(t)}
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden />
                          가져오기
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                지금 보고 있는 페이지의 블록 구성을 다른 사람과 공유합니다.
              </p>
              <div>
                <label className="text-sm font-medium" htmlFor="tpl-title">
                  제목
                </label>
                <input
                  id="tpl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder="예: 반도체 수익성 한눈에"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="tpl-desc">
                  설명 (선택)
                </label>
                <textarea
                  id="tpl-desc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="이 템플릿이 무엇을 보는지 간단히"
                  className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              <Button
                type="button"
                className="w-full gap-2"
                disabled={publishing}
                onClick={handlePublish}
              >
                <Upload className="h-4 w-4" aria-hidden />
                {publishing ? "공유 중…" : "공유하기"}
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
