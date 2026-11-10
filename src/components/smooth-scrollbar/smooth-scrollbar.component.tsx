import React, { useRef, useLayoutEffect } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import SmoothScrollbar from "smooth-scrollbar";
import type { ScrollbarOptions, ScrollStatus } from "smooth-scrollbar/interfaces";

// In-repo replacement for react-smooth-scrollbar@8 (legacy context / componentWillReceiveProps).
// Same DOM (<section data-scrollbar><div>{children}</div></section>), same props (option props
// are forwarded to Scrollbar.init, onScroll(status, scrollbar) fires on every scroll update,
// remaining props land on the <section>), and scrollbar.update() runs after every re-render.

type ScrollbarInstance = ReturnType<typeof SmoothScrollbar.init>;

// The package types `plugins` as `any` and have no `syncCallbacks` (it is still forwarded, as before).
type OptionProps = Omit<Partial<ScrollbarOptions>, "plugins" | "delegateTo"> & {
  syncCallbacks?: boolean;
};

type ScrollbarProps = OptionProps &
  Omit<HTMLAttributes<HTMLElement>, "onScroll" | "children"> & {
    plugins?: Record<string, unknown>;
    onScroll?: (status: ScrollStatus, scrollbar: ScrollbarInstance) => void;
    children?: ReactNode;
  };

// Drops `undefined` entries (the original only forwarded option props that were set).
const definedOptions = <T extends object>(source: T): Partial<T> => {
  const result: Partial<T> = {};
  // Object.keys returns string[]; the cast restores the key type (standard idiom, no runtime effect).
  (Object.keys(source) as Array<keyof T>).forEach((key) => {
    if (source[key] !== undefined) result[key] = source[key];
  });
  return result;
};

const Scrollbar = (props: ScrollbarProps) => {
  const {
    damping,
    thumbMinSize,
    syncCallbacks,
    renderByPixels,
    alwaysShowTracks,
    continuousScrolling,
    wheelEventTarget,
    plugins,
    onScroll,
    children,
    ...others
  } = props;
  const optionProps: OptionProps = {
    damping,
    thumbMinSize,
    syncCallbacks,
    renderByPixels,
    alwaysShowTracks,
    continuousScrolling,
    wheelEventTarget,
  };

  const containerRef = useRef<HTMLElement>(null);
  const scrollbarRef = useRef<ScrollbarInstance | null>(null);
  const onScrollRef = useRef(onScroll);
  const mountedRef = useRef(false);
  onScrollRef.current = onScroll; // always call the latest handler, as the original did via this.props

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return; // always set once mounted; the guard only satisfies the types
    const options = definedOptions({ ...optionProps, plugins });
    const scrollbar = SmoothScrollbar.init(container, options);
    scrollbarRef.current = scrollbar;
    const listener = (status: ScrollStatus) => {
      if (onScrollRef.current) onScrollRef.current(status, scrollbar);
    };
    scrollbar.addListener(listener);
    mountedRef.current = true;
    return () => {
      scrollbar.removeListener(listener);
      scrollbar.destroy();
      scrollbarRef.current = null;
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // componentWillReceiveProps + componentDidUpdate equivalent (skipped on the first render)
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const scrollbar = scrollbarRef.current;
    if (!scrollbar) return;
    Object.assign(scrollbar.options, definedOptions(optionProps));
    if (plugins) {
      Object.keys(plugins).forEach((name) => scrollbar.updatePluginOptions(name, plugins[name]));
    }
    scrollbar.update();
  });

  return (
    <section data-scrollbar ref={containerRef} {...others}>
      <div>{children}</div>
    </section>
  );
};

export default Scrollbar;
