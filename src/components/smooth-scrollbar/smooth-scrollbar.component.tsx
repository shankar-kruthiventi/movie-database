import React, { useRef, useLayoutEffect } from "react";
import SmoothScrollbar from "smooth-scrollbar";

// In-repo replacement for react-smooth-scrollbar@8 (legacy context / componentWillReceiveProps).
// Same DOM (<section data-scrollbar><div>{children}</div></section>), same props (option props
// are forwarded to Scrollbar.init, onScroll(status, scrollbar) fires on every scroll update,
// remaining props land on the <section>), and scrollbar.update() runs after every re-render.
const OPTION_KEYS = [
  "damping",
  "thumbMinSize",
  "syncCallbacks",
  "renderByPixels",
  "alwaysShowTracks",
  "continuousScrolling",
  "wheelEventTarget",
];

const Scrollbar = (props) => {
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

  const containerRef = useRef(null);
  const scrollbarRef = useRef(null);
  const onScrollRef = useRef(onScroll);
  const mountedRef = useRef(false);
  onScrollRef.current = onScroll; // always call the latest handler, as the original did via this.props

  useLayoutEffect(() => {
    const options = {};
    OPTION_KEYS.forEach((key) => {
      if (props[key] !== undefined) options[key] = props[key];
    });
    if (plugins !== undefined) options.plugins = plugins;
    const scrollbar = SmoothScrollbar.init(containerRef.current, options);
    scrollbarRef.current = scrollbar;
    const listener = (status) => {
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
    OPTION_KEYS.forEach((key) => {
      if (props[key] !== undefined) scrollbar.options[key] = props[key];
    });
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
