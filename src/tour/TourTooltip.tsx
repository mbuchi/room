import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { TooltipRenderProps } from "react-joyride";

import { appTourConfig } from "./tour.config";
import { useI18n } from "../contexts/I18nContext";

// groove has no ThemeContext — derive dark mode from the DOM instead.
function detectDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.classList.contains("dark")) return true;
  return document.querySelector(".dark") !== null;
}

const VARELA = '"Varela Round", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SYSTEM =
  '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Centralised palette so dark/light look intentional, not ad-hoc.
function buildPalette(isDark: boolean, primary: string) {
  if (isDark) {
    return {
      surface: "#0b1220",
      surfaceTint: "rgba(255,255,255,0.02)",
      ring: "rgba(148,163,184,0.14)",
      shadow:
        "0 24px 48px -16px rgba(0,0,0,0.7), 0 8px 16px -8px rgba(0,0,0,0.5), 0 0 0 1px rgba(148,163,184,0.10)",
      eyebrow: primary,
      title: "#f1f5f9",
      body: "#cbd5e1",
      divider: "rgba(148,163,184,0.10)",
      mutedText: "#64748b",
      mutedTextHover: "#cbd5e1",
      iconBtnText: "#94a3b8",
      iconBtnHoverBg: "rgba(148,163,184,0.10)",
      iconBtnHoverText: "#e2e8f0",
      progressTrack: "rgba(148,163,184,0.14)",
    };
  }
  return {
    surface: "#ffffff",
    surfaceTint: "rgba(255,255,255,0.6)",
    ring: "rgba(15,23,42,0.06)",
    shadow:
      "0 24px 48px -16px rgba(2,6,23,0.20), 0 8px 16px -8px rgba(2,6,23,0.10), 0 0 0 1px rgba(15,23,42,0.05)",
    eyebrow: primary,
    title: "#0f172a",
    body: "#475569",
    divider: "rgba(15,23,42,0.06)",
    mutedText: "#94a3b8",
    mutedTextHover: "#475569",
    iconBtnText: "#64748b",
    iconBtnHoverBg: "rgba(15,23,42,0.05)",
    iconBtnHoverText: "#0f172a",
    progressTrack: "rgba(15,23,42,0.06)",
  };
}

export function TourTooltip({
  backProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const { t } = useI18n();
  const isDarkMode = detectDarkMode();
  const primary = appTourConfig.behavior.primaryColor ?? "#DC2626";
  const p = buildPalette(isDarkMode, primary);

  // Progress fills as the user advances — completed when on the last step.
  const progressPct = size <= 1 ? 100 : ((index + 1) / size) * 100;

  return (
    <div
      {...tooltipProps}
      style={{
        width: 380,
        borderRadius: 18,
        overflow: "hidden",
        background: p.surface,
        boxShadow: p.shadow,
        fontFamily: VARELA,
        animation: "swissnovoTourFadeIn 220ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Progress bar — replaces the old static accent stripe + dot row */}
      <div
        style={{
          position: "relative",
          height: 3,
          background: p.progressTrack,
        }}
        aria-hidden
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${progressPct}%`,
            background: `linear-gradient(90deg, ${primary} 0%, ${primary} 60%, ${primary}cc 100%)`,
            transition: "width 320ms cubic-bezier(0.16, 1, 0.3, 1)",
            borderTopRightRadius: progressPct < 100 ? 2 : 0,
            borderBottomRightRadius: progressPct < 100 ? 2 : 0,
          }}
        />
      </div>

      {/* Body */}
      <div style={{ padding: "22px 24px 6px" }}>
        <div
          style={{
            fontFamily: SYSTEM,
            fontSize: 10.5,
            letterSpacing: "0.12em",
            fontWeight: 600,
            textTransform: "uppercase",
            color: p.eyebrow,
            marginBottom: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: 999,
              background: primary,
              boxShadow: `0 0 0 3px ${primary}1f`,
            }}
          />
          {t('tour.step_of', { index: index + 1, total: size })}
        </div>
        {step.title && (
          <h3
            style={{
              margin: 0,
              fontFamily: VARELA,
              fontSize: 20,
              fontWeight: 400,
              lineHeight: 1.3,
              color: p.title,
              letterSpacing: "-0.01em",
            }}
          >
            {step.title}
          </h3>
        )}
        <div
          style={{
            marginTop: 8,
            fontFamily: VARELA,
            fontSize: 14.5,
            lineHeight: 1.55,
            color: p.body,
          }}
        >
          {step.content}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 18,
          padding: "12px 16px 14px 24px",
          borderTop: `1px solid ${p.divider}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: isDarkMode ? p.surfaceTint : "transparent",
        }}
      >
        <button
          {...skipProps}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: SYSTEM,
            fontSize: 12.5,
            fontWeight: 500,
            padding: "6px 4px",
            borderRadius: 8,
            color: p.mutedText,
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = p.mutedTextHover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = p.mutedText;
          }}
        >
          {t('tour.skip')}
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {index > 0 && (
            <button
              {...backProps}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: p.iconBtnHoverBg,
                color: p.iconBtnHoverText,
                border: `1px solid ${p.divider}`,
                cursor: "pointer",
                fontFamily: SYSTEM,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.005em",
                height: 34,
                padding: "0 14px",
                borderRadius: 10,
                transition: "background 0.15s ease, color 0.15s ease, transform 0.12s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = isDarkMode
                  ? "rgba(148,163,184,0.18)"
                  : "rgba(15,23,42,0.09)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = p.iconBtnHoverBg;
                el.style.transform = "scale(1)";
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
            >
              <ArrowLeft size={14} aria-hidden /> {t('tour.back')}
            </button>
          )}
          <button
            {...primaryProps}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: primary,
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              fontFamily: SYSTEM,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.005em",
              height: 34,
              padding: "0 16px",
              borderRadius: 10,
              boxShadow: `0 6px 14px -4px ${primary}80, inset 0 -1px 0 rgba(0,0,0,0.12)`,
              transition: "transform 0.12s ease, box-shadow 0.18s ease, filter 0.15s ease",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.boxShadow = `0 10px 22px -6px ${primary}99, inset 0 -1px 0 rgba(0,0,0,0.12)`;
              el.style.filter = "brightness(1.05)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.boxShadow = `0 6px 14px -4px ${primary}80, inset 0 -1px 0 rgba(0,0,0,0.12)`;
              el.style.filter = "brightness(1)";
              el.style.transform = "scale(1)";
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            {isLastStep ? (
              <>
                <Check size={14} aria-hidden /> {t('tour.done')}
              </>
            ) : (
              <>
                {t('tour.next')} <ArrowRight size={14} aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
