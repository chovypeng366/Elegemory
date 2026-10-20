import { Maximize2, Minus, X } from "lucide-react";
import { handleWindowDrag } from "../../lib/drag";
import {
  hideCurrentWindow,
  minimizeCurrentWindow,
  toggleMaximizeCurrentWindow,
} from "../../services/system";
import { IconButton } from "../../components/IconButton";
import { LogoMark } from "../../components/LogoMark";

export function WindowChrome() {
  return (
    <header
      onMouseDown={handleWindowDrag}
      onDoubleClick={(event) => {
        if (!(event.target as HTMLElement).closest("button")) {
          void toggleMaximizeCurrentWindow();
        }
      }}
      className="relative z-20 flex h-11 shrink-0 select-none items-center justify-between border-b border-line/70 bg-canvas/55 pl-4 pr-2"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <LogoMark className="size-[22px]" />
        <span className="font-serif text-[15.5px] tracking-[0.04em] text-ink/90">
          Elegemory
        </span>
        <span className="mx-1 hidden h-3 w-px bg-line md:block" />
        <span className="hidden truncate text-[10.5px] tracking-[0.04em] text-muted/60 lg:block">
          把掠过手边的东西，轻轻留住
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <IconButton
          label="最小化"
          className="window-control"
          onClick={() => void minimizeCurrentWindow()}
        >
          <Minus size={15} />
        </IconButton>
        <IconButton
          label="最大化或还原"
          className="window-control"
          onClick={() => void toggleMaximizeCurrentWindow()}
        >
          <Maximize2 size={13} />
        </IconButton>
        <IconButton
          label="收起到系统托盘"
          className="window-control close-control"
          onClick={() => void hideCurrentWindow()}
        >
          <X size={15} />
        </IconButton>
      </div>
    </header>
  );
}
