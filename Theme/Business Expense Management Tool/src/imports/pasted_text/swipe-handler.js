"use strict";
(globalThis.webpackChunkfe_build_setup = globalThis.webpackChunkfe_build_setup || []).push([[3951], {
    860: (t, e, i) => {
        i.d(e, {
            H: () => s
        });
        var n = i(45876);
        function s(t) {
            return (0,
            n.r)(t.map(t => new Promise( (e, i) => {
                t.sheet ? e("Stylesheet already loaded") : (t.addEventListener("load", () => e("Stylesheet loaded")),
                t.addEventListener("error", () => i(new Error(`Failed to load stylesheet: ${t.href}`))))
            }
            )))
        }
    }
    ,
    1205: (t, e, i) => {
        i.d(e, {
            F: () => s
        });
        var n = i(22459);
        const s = Object.fromEntries(Object.entries(n.l).map( ([t,e]) => [t, `.${e}`]))
    }
    ,
    2925: (t, e, i) => {
        function n(t, e, i, n) {
            let s = -1
              , o = 0
              , a = ""
              , r = "";
            if (-1 !== t.indexOf(`.${e}.`))
                return t;
            if (i && (s = t.lastIndexOf(`.${i}.`)),
            -1 === s) {
                if (n)
                    return t;
                s = t.lastIndexOf(".")
            } else
                i && (o = i.length + 1);
            return a = t.substr(0, s),
            r = t.substr(s + o),
            `${a}.${e}${r}`
        }
        i.d(e, {
            C: () => n
        })
    }
    ,
    4499: (t, e, i) => {
        i.d(e, {
            o: () => s
        });
        var n = i(33747);
        function s(t) {
            return (0,
            n.G)(t) && Object.keys(t).length > 0
        }
    }
    ,
    4607: (t, e, i) => {
        i.d(e, {
            R: () => s
        });
        var n = i(33747);
        function s(t) {
            return (0,
            n.G)(t) && 0 === Object.keys(t).length
        }
    }
    ,
    4894: (t, e, i) => {
        function n(t, e) {
            !function(t, e) {
                t && e && "" !== e && t.classList.value.split(" ").forEach(i => {
                    if (!(i.indexOf(e) > 0))
                        return;
                    const n = i.replace(e, "");
                    t.classList.remove(i),
                    t.classList.add(n)
                }
                )
            }(t, `--${e}`)
        }
        i.d(e, {
            G: () => n
        })
    }
    ,
    7186: (t, e, i) => {
        i.d(e, {
            G: () => s
        });
        var n = i(44254);
        function s(t) {
            if (!Array.isArray(t))
                throw new TypeError("Input must be an array.");
            const e = t.length;
            if (0 === e)
                throw new Error("Cannot calculate the average of an empty array.");
            if (!t.every(t => "number" == typeof t))
                throw new TypeError("All array elements must be numbers.");
            const i = Array(e).fill(1 / e);
            return (0,
            n.L)(t, i)
        }
    }
    ,
    7209: (t, e, i) => {
        function n(t) {
            return "function" == typeof t
        }
        i.d(e, {
            T: () => n
        })
    }
    ,
    8107: (t, e, i) => {
        i.d(e, {
            A: () => A
        });
        var n = i(57563);
        const s = "left"
          , o = "right";
        class a {
            constructor(t, e) {
                this.el = t,
                this.options = {
                    minDistanceToConfirmSwipe: 35,
                    minDistanceToDetermineDirection: 10,
                    blockScrollX: !0,
                    blockScrollY: !1,
                    callbackSwipeStart: void 0,
                    callbackSwipeMove: void 0,
                    callbackSwipeEnd: void 0,
                    callbackSwipeCancel: void 0,
                    excludedFromSwipe: [],
                    ...e
                },
                this.isPendingRequestAnimationFrame = !1,
                this.shouldClick = !0,
                this.handleGestureStart = this.handleGestureStart.bind(this),
                this.handleGestureMove = this.handleGestureMove.bind(this),
                this.handleGestureEnd = this.handleGestureEnd.bind(this),
                this.onAnimationFrame = this.onAnimationFrame.bind(this),
                this.clickHandler = this.clickHandler.bind(this),
                this.init()
            }
            init() {
                this.setTouchAction(),
                this.addSwipeListener()
            }
            setTouchAction() {
                this.options.blockScrollX && this.options.blockScrollY ? this.el.style.touchAction = "none" : this.options.blockScrollX ? this.el.style.touchAction = "pan-y" : this.options.blockScrollY && (this.el.style.touchAction = "pan-x")
            }
            addSwipeListener() {
                this.el.addEventListener("touchstart", this.handleGestureStart, !0),
                this.el.addEventListener("mousedown", this.handleGestureStart, !0),
                this.el.addEventListener("click", this.clickHandler)
            }
            clickHandler(t) {
                this.shouldClick || (t.preventDefault(),
                t.stopPropagation(),
                t.stopImmediatePropagation())
            }
            handleGestureStart(t) {
                t.touches?.length > 1 || -1 !== this.options.excludedFromSwipe.indexOf(t.target) || (this.el.addEventListener("touchmove", this.handleGestureMove, !0),
                this.el.addEventListener("touchend", this.handleGestureEnd, !0),
                this.el.addEventListener("touchcancel", this.handleGestureEnd, !0),
                document.addEventListener("mousemove", this.handleGestureMove, !0),
                document.addEventListener("mouseup", this.handleGestureEnd, !0),
                this.initialTouchPosition = this.getGesturePointFromEvent(t),
                this.lastTouchPosition = this.initialTouchPosition,
                this.options.callbackSwipeStart?.(this.getSwipeEvent()))
            }
            handleGestureMove(t) {
                "mousemove" === t.type && t.preventDefault(),
                this.initialTouchPosition && !this.isPendingRequestAnimationFrame && (this.lastTouchPosition = this.getGesturePointFromEvent(t),
                this.isPendingRequestAnimationFrame = !0,
                requestAnimationFrame(this.onAnimationFrame))
            }
            handleGestureEnd(t) {
                if (!(t.touches?.length > 0)) {
                    if (this.lastTouchPosition = this.getGesturePointFromEvent(t, !0),
                    this.isPendingRequestAnimationFrame = !1,
                    this.el.removeEventListener("touchmove", this.handleGestureMove, !0),
                    this.el.removeEventListener("touchend", this.handleGestureEnd, !0),
                    this.el.removeEventListener("touchcancel", this.handleGestureEnd, !0),
                    document.removeEventListener("mousemove", this.handleGestureMove, !0),
                    document.removeEventListener("mouseup", this.handleGestureEnd, !0),
                    this.getScrolledDistance() < this.options.minDistanceToConfirmSwipe)
                        return this.options.callbackSwipeCancel?.(),
                        void (this.shouldClick = !0);
                    this.shouldClick = !1,
                    this.options.callbackSwipeEnd?.(this.getSwipeEvent()),
                    this.initialTouchPosition = null
                }
            }
            getGesturePointFromEvent(t, e=!1) {
                const i = {};
                return e && t.changedTouches ? (i.x = t.changedTouches[0].clientX,
                i.y = t.changedTouches[0].clientY) : t.targetTouches ? (i.x = t.targetTouches[0].clientX,
                i.y = t.targetTouches[0].clientY) : (i.x = t.clientX,
                i.y = t.clientY),
                i
            }
            onAnimationFrame() {
                this.isPendingRequestAnimationFrame && (this.options.callbackSwipeMove?.(this.getSwipeEvent()),
                this.isPendingRequestAnimationFrame = !1)
            }
            getDirectionInAxis(t) {
                let e;
                const i = this.initialTouchPosition[t] - this.lastTouchPosition[t];
                return e = Math.abs(i) < this.options.minDistanceToDetermineDirection ? "none" : i < 0 ? "x" === t ? s : "down" : "x" === t ? o : "up",
                e
            }
            getSwipeEvent() {
                return {
                    target: this.el,
                    initialTouchPosition: this.initialTouchPosition,
                    lastTouchPosition: this.lastTouchPosition,
                    horizontalDirection: this.getDirectionInAxis("x"),
                    verticalDirection: this.getDirectionInAxis("y")
                }
            }
            getScrolledDistance() {
                const t = Math.abs(this.initialTouchPosition.x - this.lastTouchPosition.x)
                  , e = Math.abs(this.initialTouchPosition.y - this.lastTouchPosition.y);
                return Math.hypot(t, e)
            }
        }
        var r = i(83391)
          , l = i(14672)
          , c = i(43138)
          , d = i(87753)
          , h = i(52658)
          , u = i(63264)
          , p = i(88835)
          , m = i(49375)
          , g = i(67474)
          , b = i(31196);
        let f = !1;
        var v = i(93461)
          , w = i(21030)
          , S = i(35327)
          , y = i(38349)
          , C = i(66432);
        class A {
            constructor(t, e) {
                this.el = t,
                this.options = {
                    autoplay: !1,
                    autoplayTransitionDelay: 5e3,
                    excludedFromSwipe: [],
                    hasGradients: !1,
                    infiniteLoop: !1,
                    intermediateStepScrolling: !1,
                    intersectionRatioThreshold: .5,
                    manuallyScrollable: !1,
                    minScrollOffset: 5,
                    multiSlideView: !1,
                    navigateOnScrollThreshold: null,
                    navigateToSlideOnScroll: !1,
                    preselectedSlideIndex: null,
                    sliding: !1,
                    toggleBetweenPauseAndStart: !1,
                    callbacks: {
                        onAutoplayStart: null,
                        onAutoplayEnd: null,
                        onSliderUpdate: null
                    },
                    ...e
                },
                this.options.manuallyScrollable && (this.options.sliding = !0),
                this.el.uuid ??= (0,
                u.l)(),
                this.onPreviousButtonClick = this.onPreviousButtonClick.bind(this),
                this.onNextButtonClick = this.onNextButtonClick.bind(this),
                this.onStartButtonClick = this.onStartButtonClick.bind(this),
                this.onPauseButtonClick = this.onPauseButtonClick.bind(this),
                this.onResetButtonClick = this.onResetButtonClick.bind(this),
                this.onIndicatorClick = this.onIndicatorClick.bind(this),
                this.onKeyDown = this.onKeyDown.bind(this),
                this.onSwipeEnd = this.onSwipeEnd.bind(this),
                this.resetAutoplayInterval = this.resetAutoplayInterval.bind(this),
                this.clearAutoplayInterval = this.clearAutoplayInterval.bind(this),
                this.onScrollEventListener = this.onScrollEventListener.bind(this),
                this.onResizeDebounced = (0,
                d.s)(500, this.onResize.bind(this)),
                this.onScrollThrottled = (0,
                h.n)(r.GY.scroll, this.onScroll.bind(this)),
                this.onScrollEndDebounced = (0,
                d.s)(r.GY.scroll, this.onScrollEnd.bind(this)),
                (0,
                m.nr)() && function(t=!1) {
                    f || (t && (window.__forceSmoothScrollPolyfill__ = !0),
                    b.polyfill(),
                    f = !0)
                }(!0),
                this.init()
            }
            init() {
                this.active = !0,
                this.activeSlideIndex = C.tT.initialSlideIndex,
                this.isPaused = !1,
                this.isPausedOnButtonClick = !1,
                this.movementDirection = C.Qq.none,
                this.isRTL = (0,
                v.a)(),
                this.isProgrammaticScroll = !1,
                this.slideStartDirection = this.isRTL ? o : s,
                this.slideEndDirection = this.isRTL ? s : o,
                this.visibleSlidesIndices = [],
                this.detachedSliderA11yAttributes = [],
                this.setElements(),
                this.options.sliding && (this.previousContainerScrollStart = this.getContainerScrollStart(),
                this.isSmoothScrollSupported = CSS.supports("scroll-behavior", "smooth")),
                this.slides?.length && (this.totalSlidesCount = this.slides.length,
                this.base?.classList.add(C.Nv.baseActive),
                this.afterComputedStylesUpdate( () => {
                    this.lastSlideIndex = this.totalSlidesCount - 1,
                    this.setSliderData(),
                    this.updateActiveSlide(),
                    (0,
                    p.E)(this.options.preselectedSlideIndex) && this.navigate(this.options.preselectedSlideIndex, C.Uj.none)
                }
                ),
                this.displayObserver = new l.h(this.el,{
                    onShow: this.onResizeDebounced
                }),
                this.addEventListeners(),
                this.updateIndicatorNumbers(),
                this.options.autoplay && n.NN.observe(this.el, this.onAutoplayIOManagerIntersection.bind(this), this.el.uuid))
            }
            afterComputedStylesUpdate(t) {
                requestAnimationFrame(t)
            }
            resetAutoplayInterval(t=!1) {
                (this.options.autoplay || t) && (this.clearAutoplayInterval(),
                !this.options.infiniteLoop && this.isSliderEnd() || this.isPaused || (this.autoplayIntervalId = setInterval( () => {
                    "visible" === document.visibilityState && (this.onNextButtonClick(C.Uj.autoplayNext),
                    !this.options.infiniteLoop && this.isSliderEnd() && this.clearAutoplayInterval())
                }
                , this.options.autoplayTransitionDelay),
                this.options.callbacks?.onAutoplayStart?.()))
            }
            clearAutoplayInterval() {
                this.autoplayIntervalId && (clearInterval(this.autoplayIntervalId),
                this.autoplayIntervalId = null,
                this.options.callbacks?.onAutoplayEnd?.())
            }
            navigate(t, e) {
                t < C.tT.initialSlideIndex || t > this.lastSlideIndex || (this.isProgrammaticScroll = !0,
                this.setMovementDirection(t),
                this.setActiveSlide(t),
                this.updateActiveSlide(),
                this.moveIndicatorIntoView(t),
                this.el.matches(":hover") || this.el.contains(this.el.querySelector(":focus")) || this.resetAutoplayInterval(),
                this.options.analytics?.enabled && (0,
                c.DK)(this.slides[t], e, this.options.analytics.clickAction))
            }
            navigateAndMoveFocus(t, e) {
                this.navigate(t, e);
                const i = this.indicatorButtons[this.activeSlideIndex];
                if (i)
                    this.focusWithoutScroll(i);
                else {
                    const t = this.slides[this.activeSlideIndex]
                      , e = t?.querySelector(S.ul.tabbingEnabledElements);
                    e && (this.focusWithoutScroll(e),
                    this.setContainerScrollStart(this.activeSlideData.positions.start))
                }
            }
            navigateToClosestReachableSlide(t) {
                t > this.maxReachableSlideIndex ? this.navigate(this.maxReachableSlideIndex, "") : this.navigate(t, "")
            }
            moveIndicatorIntoView(t) {
                const e = this.indicatorButtons[t];
                e && (this.indicatorsWrapper.scrollLeft = e.offsetWidth * t)
            }
            focusWithoutScroll(t) {
                const {scrollX: e, scrollY: i} = window;
                t.focus(),
                window.scrollTo(e, i)
            }
            isSliderStart() {
                if (this.options.sliding && this.options.manuallyScrollable) {
                    const t = this.getContainerScrollStart();
                    return this.activeSlideIndex === C.tT.initialSlideIndex && t <= this.options.minScrollOffset
                }
                return this.activeSlideIndex === C.tT.initialSlideIndex
            }
            isSliderEnd() {
                if (this.options.sliding) {
                    const {offsetWidth: t=null, scrollWidth: e=null} = this.container;
                    return this.getTargetContainerScrollStart() + t >= e - this.options.minScrollOffset
                }
                return this.activeSlideIndex === this.lastSlideIndex
            }
            isSlideCurrentlyVisible(t) {
                const {start: e, end: i} = this.slidesData[t].positions
                  , n = i - e
                  , {offsetWidth: s} = this.container
                  , o = this.getTargetContainerScrollStart()
                  , a = o + s;
                let r;
                return r = n < s ? e >= o && i <= a : e <= o && i >= a,
                r
            }
            isInfiniteSliderEndWithMultiSlideView() {
                const {infiniteLoop: t, manuallyScrollable: e, multiSlideView: i, intermediateStepScrolling: n} = this.options;
                return t && n && i && e && this.isSliderEnd()
            }
            getNextIndex() {
                return this.isSliderEnd() ? this.options.infiniteLoop ? C.tT.initialSlideIndex : this.activeSlideIndex : this.activeSlideIndex + 1
            }
            getPreviousIndex() {
                return this.isSliderStart() ? this.options.infiniteLoop ? this.lastSlideIndex : this.activeSlideIndex : this.activeSlideIndex - 1
            }
            getActiveSlideFromScrollPositionAndDirection() {
                const t = this.getContainerScrollStart()
                  , e = this.movementDirection === C.Qq.forward;
                if (!this.options.navigateToSlideOnScroll)
                    return this.slidesData.findIndex( ({positions: i}) => (e ? i.start : i.end) > t);
                const {offsetWidth: i} = this.container
                  , n = this.movementDirection === C.Qq.backward
                  , {positions: s, marginsSum: o} = this.activeSlideData
                  , a = s.start
                  , r = s.end;
                let l = this.activeSlideIndex;
                return e && a < t + o && r - t <= i / 2 - o && l < this.lastSlideIndex ? l++ : n && a >= t - o && l > C.tT.initialSlideIndex && l--,
                l
            }
            getIndexFromAttribute(t) {
                return parseInt(t, 10) - 1
            }
            getSlidesData() {
                const t = [];
                let e = 0;
                return this.slides.forEach( (i, n) => {
                    const s = window.getComputedStyle(i)
                      , o = parseInt(s.marginLeft, 10) + parseInt(s.marginRight, 10)
                      , a = i.offsetWidth + o
                      , r = e + i.offsetWidth;
                    t.push({
                        positions: {
                            start: e,
                            end: r
                        },
                        marginsSum: o
                    }),
                    n < this.totalSlidesCount && (e += a)
                }
                ),
                t
            }
            getVisibleSlidesIndices() {
                return this.visibleSlidesIndices
            }
            getContainerScrollStart() {
                return this.isRTL ? Math.abs(this.container.scrollLeft) : this.container.scrollLeft
            }
            getRoundedDownContainerScrollStart() {
                return Math.floor(this.getContainerScrollStart())
            }
            getTargetContainerScrollStart() {
                return (0,
                p.E)(this.targetContainerScrollStart) ? this.targetContainerScrollStart : this.getContainerScrollStart()
            }
            getMaxReachableSlideIndex() {
                return this.slidesData.findIndex(t => t.positions.start > this.maxScrollLeft)
            }
            setSliderData() {
                this.slidesData = this.getSlidesData(),
                this.activeSlideData = this.slidesData[this.activeSlideIndex],
                this.maxScrollLeft = this.container.scrollWidth - this.container.offsetWidth,
                this.maxReachableSlideIndex = this.getMaxReachableSlideIndex()
            }
            setElements() {
                this.base = this.el.querySelector(C.ZM.base) || this.el.closest(C.ZM.base),
                this.container = this.el.querySelector(C.ZM.container),
                this.indicatorButtons = Array.from(this.el.querySelectorAll(C.ZM.indicatorButton)),
                this.indicatorActiveSlideNumber = this.el.querySelector(C.ZM.indicatorActiveSlideNumber),
                this.indicatorTotalCountNumber = this.el.querySelector(C.ZM.indicatorTotalCountNumber),
                this.indicators = Array.from(this.el.querySelectorAll(C.ZM.indicator)),
                this.indicatorsWrapper = this.el.querySelector(C.ZM.indicatorsWrapper),
                this.slides = Array.from(this.el.querySelectorAll(C.ZM.slide)),
                this.next = this.el.querySelector(C.ZM.next),
                this.pause = this.el.querySelector(C.ZM.pause),
                this.previous = this.el.querySelector(C.ZM.previous),
                this.reset = this.el.querySelector(C.ZM.reset),
                this.start = this.el.querySelector(C.ZM.start),
                this.screenReaderInfo = this.el.querySelector(C.ZM.screenReaderInfo),
                this.screenReaderInfoCount = this.el.querySelector(C.ZM.screenReaderInfoCount),
                this.options.hasGradients && (this.gradientLeft = this.el.querySelector(C.ZM.gradientLeft),
                this.gradientRight = this.el.querySelector(C.ZM.gradientRight))
            }
            setActiveSlide(t) {
                t < C.tT.initialSlideIndex || t > this.lastSlideIndex || (t !== this.activeSlideIndex ? (this.activeSlideIndex = t,
                this.activeSlideData = this.slidesData[t]) : this.movementDirection = C.Qq.none)
            }
            setMovementDirection(t=null, e=null) {
                const i = t || !this.options.sliding ? t > this.activeSlideIndex : e > this.previousContainerScrollStart
                  , n = t || !this.options.sliding ? t < this.activeSlideIndex : e < this.previousContainerScrollStart;
                i ? this.movementDirection = C.Qq.forward : n && (this.movementDirection = C.Qq.backward)
            }
            setContainerScrollStart(t) {
                let e = t;
                this.options.multiSlideView && e >= this.maxScrollLeft && (e = this.maxScrollLeft),
                this.targetContainerScrollStart = e,
                this.container.scrollTo({
                    left: this.isRTL ? -e : e,
                    behavior: "smooth"
                })
            }
            setScreenReaderInfo() {
                this.screenReaderInfo && (this.screenReaderInfoCount.textContent = (0,
                c.Ix)(this.getVisibleSlidesIndices()))
            }
            updateIndicatorNumbers() {
                this.indicatorActiveSlideNumber && this.indicatorTotalCountNumber && (this.indicatorActiveSlideNumber.innerText = `${this.activeSlideIndex + 1}`,
                this.indicatorTotalCountNumber.innerText = `${this.totalSlidesCount}`)
            }
            updateUIElements() {
                this.updateIndicatorNumbers(),
                this.updateArrowNavigationButtons(),
                this.updateGradients()
            }
            updateActiveSlide(t=!0) {
                (this.options.sliding || this.options.multiSlideView) && this.movementDirection !== C.Qq.none && t && this.setContainerScrollStart(this.activeSlideData.positions.start),
                this.updateUIElements(),
                this.visibleSlidesIndices = [],
                this.slides.forEach( (t, e) => {
                    const i = this.indicators[e]
                      , n = this.indicatorButtons[e];
                    e === this.activeSlideIndex ? (t.classList.add(C.Nv.slideActive),
                    i?.classList.add(C.Nv.indicatorActive),
                    n?.setAttribute(S.vj.ariaCurrent, !0),
                    n?.setAttribute(S.vj.tabIndex, "0")) : (t.classList.remove(C.Nv.slideActive),
                    i?.classList.remove(C.Nv.indicatorActive),
                    n?.removeAttribute(S.vj.ariaCurrent),
                    n?.setAttribute(S.vj.tabIndex, "-1")),
                    this.isSlideCurrentlyVisible(e) ? ((0,
                    g.F)(t, !0),
                    t.removeAttribute(S.vj.ariaHidden),
                    this.visibleSlidesIndices.push(e)) : ((0,
                    g.F)(t, !1),
                    t.setAttribute(S.vj.ariaHidden, !0))
                }
                ),
                this.setScreenReaderInfo(),
                this.options.callbacks.onSliderUpdate?.({
                    activeSlideIndex: this.activeSlideIndex
                })
            }
            updateGradients() {
                if (this.options.hasGradients) {
                    const t = this.options.infiniteLoop || !this.isSliderStart()
                      , e = this.options.infiniteLoop || !this.isSliderEnd();
                    (0,
                    c.ZA)(this.gradientLeft, t),
                    (0,
                    c.ZA)(this.gradientRight, e)
                }
            }
            updateArrowNavigationButtons() {
                const t = this.container.offsetWidth >= this.container.scrollWidth;
                let e, i;
                this.options.multiSlideView && t ? (e = !1,
                i = !1) : (e = this.options.infiniteLoop || !this.isSliderStart(),
                i = this.options.infiniteLoop || !this.isSliderEnd()),
                (0,
                c.HI)(this.previous, e),
                (0,
                c.HI)(this.next, i)
            }
            updateStartPauseButtonStates() {
                this.options.infiniteLoop && this.options.toggleBetweenPauseAndStart && (this.pause.classList.toggle(y.N.isHidden),
                this.start.classList.toggle(y.N.isHidden))
            }
            refreshSlides() {
                this.afterComputedStylesUpdate( () => {
                    this.setSliderData(),
                    this.updateActiveSlide()
                }
                )
            }
            onResize() {
                this.active && this.refreshSlides()
            }
            onStartButtonClick() {
                this.updateStartPauseButtonStates(),
                this.isPaused = !1,
                this.isPausedOnButtonClick = !1,
                this.pause.focus(),
                this.resetAutoplayInterval(!0)
            }
            onPauseButtonClick() {
                this.updateStartPauseButtonStates(),
                this.isPaused = !0,
                this.isPausedOnButtonClick = !0,
                this.start.focus(),
                this.clearAutoplayInterval()
            }
            onResetButtonClick() {
                this.navigate(C.tT.initialSlideIndex, C.Uj.otherIcon)
            }
            onPreviousButtonClick() {
                const t = this.getRoundedDownContainerScrollStart()
                  , e = this.activeSlideData.positions.start;
                if (this.isInfiniteSliderEndWithMultiSlideView()) {
                    const t = this.getActiveSlideFromScrollPositionAndDirection() - 1;
                    this.navigate(t, C.Uj.nextArrow)
                } else
                    this.options.intermediateStepScrolling && t > e ? (this.isProgrammaticScroll = !0,
                    this.setContainerScrollStart(e)) : this.navigate(this.getPreviousIndex(), C.Uj.nextArrow)
            }
            onNextButtonClick(t) {
                const {offsetWidth: e} = this.container
                  , i = this.getRoundedDownContainerScrollStart()
                  , n = i + e
                  , s = this.activeSlideData.positions.end;
                if (this.isInfiniteSliderEndWithMultiSlideView())
                    this.navigate(C.tT.initialSlideIndex, t instanceof PointerEvent ? C.Uj.nextArrow : t);
                else if (this.options.intermediateStepScrolling && s > n) {
                    const t = s - n;
                    this.isProgrammaticScroll = !0,
                    this.setContainerScrollStart(i + Math.min(t, e))
                } else
                    this.navigate(this.getNextIndex(), t instanceof PointerEvent ? C.Uj.previousArrow : t)
            }
            onIndicatorClick(t) {
                const e = t.target.closest(`[${C.iw.indicatorIndex}]`);
                if (!e)
                    return;
                const i = this.getIndexFromAttribute(e.getAttribute(C.iw.indicatorIndex));
                this.navigateAndMoveFocus(i, C.Uj.otherIcon)
            }
            onKeyDown(t) {
                switch (t.key) {
                case w.f.left:
                    t.preventDefault(),
                    this.navigateAndMoveFocus(this.isRTL ? this.getNextIndex() : this.getPreviousIndex(), this.isRTL ? C.Uj.previousArrow : C.Uj.nextArrow);
                    break;
                case w.f.right:
                    t.preventDefault(),
                    this.navigateAndMoveFocus(this.isRTL ? this.getPreviousIndex() : this.getNextIndex(), this.isRTL ? C.Uj.nextArrow : C.Uj.previousArrow);
                    break;
                case w.f.home:
                    t.preventDefault(),
                    this.navigateAndMoveFocus(C.tT.initialSlideIndex, C.Uj.otherIcon);
                    break;
                case w.f.end:
                    t.preventDefault(),
                    this.navigateAndMoveFocus(this.lastSlideIndex, C.Uj.otherIcon)
                }
            }
            onSwipeEnd(t) {
                t.horizontalDirection === this.slideStartDirection ? this.navigate(this.getPreviousIndex(), C.Uj.nextArrow) : t.horizontalDirection === this.slideEndDirection && this.navigate(this.getNextIndex(), C.Uj.previousArrow)
            }
            onScrollEventListener() {
                this.onScrollThrottled(),
                this.onScrollEndDebounced()
            }
            onScroll() {
                if (this.isProgrammaticScroll || (this.targetContainerScrollStart = null),
                this.options.manuallyScrollable && !this.isProgrammaticScroll) {
                    this.options.navigateToSlideOnScroll && this.setMovementDirection(null, this.getContainerScrollStart());
                    const t = this.getActiveSlideFromScrollPositionAndDirection();
                    this.moveIndicatorIntoView(t),
                    this.setActiveSlide(t),
                    this.updateActiveSlide(this.isSmoothScrollSupported)
                } else
                    this.updateUIElements();
                this.previousContainerScrollStart = this.getContainerScrollStart()
            }
            onScrollEnd() {
                this.isProgrammaticScroll = !1
            }
            onAutoplayIOManagerIntersection(t) {
                t.intersectionRatio > this.options.intersectionRatioThreshold && !this.isPausedOnButtonClick ? (this.isPaused = !1,
                this.resetAutoplayInterval()) : (this.isPaused = !0,
                this.clearAutoplayInterval())
            }
            addEventListeners() {
                this.previous?.addEventListener("click", this.onPreviousButtonClick),
                this.next?.addEventListener("click", this.onNextButtonClick),
                this.start?.addEventListener("click", this.onStartButtonClick),
                this.pause?.addEventListener("click", this.onPauseButtonClick),
                this.reset?.addEventListener("click", this.onResetButtonClick),
                this.indicatorsWrapper?.addEventListener("click", this.onIndicatorClick),
                this.options.sliding && this.container.addEventListener("scroll", this.onScrollEventListener),
                this.swipeEventHandler || this.options.manuallyScrollable || (this.swipeEventHandler = new a(this.el,{
                    callbackSwipeEnd: this.onSwipeEnd,
                    excludedFromSwipe: this.options.excludedFromSwipe
                })),
                this.el.addEventListener("keydown", this.onKeyDown),
                this.options.autoplay && (this.el.addEventListener("focusin", this.clearAutoplayInterval),
                this.el.addEventListener("focusout", this.resetAutoplayInterval),
                this.el.addEventListener("mouseenter", this.clearAutoplayInterval),
                this.el.addEventListener("mouseleave", this.resetAutoplayInterval)),
                window.addEventListener("resize", this.onResizeDebounced),
                this.displayObserver.observe()
            }
            removeEventListeners() {
                this.previous?.removeEventListener("click", this.onPreviousButtonClick),
                this.next?.removeEventListener("click", this.onNextButtonClick),
                this.start?.removeEventListener("click", this.onStartButtonClick),
                this.pause?.removeEventListener("click", this.onPauseButtonClick),
                this.reset?.removeEventListener("click", this.onResetButtonClick),
                this.indicatorsWrapper?.removeEventListener("click", this.onIndicatorClick),
                this.options.sliding && this.container.removeEventListener("scroll", this.onScrollEventListener),
                this.el.removeEventListener("keydown", this.onKeyDown),
                this.options.autoplay && (this.el.removeEventListener("focusin", this.clearAutoplayInterval),
                this.el.removeEventListener("focusout", this.resetAutoplayInterval),
                this.el.removeEventListener("mouseenter", this.clearAutoplayInterval),
                this.el.removeEventListener("mouseleave", this.resetAutoplayInterval)),
                window.removeEventListener("resize", this.onResizeDebounced),
                this.displayObserver.unobserve()
            }
            toggleSliderA11yAttributes(t) {
                const e = [{
                    el: this.container,
                    attributes: C.G7.container
                }];
                this.screenReaderInfo && e.push({
                    el: this.screenReaderInfo,
                    attributes: C.G7.screenReaderInfo
                }),
                t ? (0,
                c.gf)(this.detachedSliderA11yAttributes) : this.detachedSliderA11yAttributes = (0,
                c.sy)(e)
            }
            activate() {
                this.active = !0,
                this.base?.classList.add(C.Nv.baseActive),
                this.addEventListeners(),
                this.updateUIElements(),
                this.activeSlideIndex = C.tT.initialSlideIndex,
                this.activeSlideData = this.slidesData[this.activeSlideIndex],
                this.updateActiveSlide(),
                this.toggleSliderA11yAttributes(!0)
            }
            deactivate() {
                this.active = !1,
                this.removeEventListeners(),
                this.base?.classList.remove(C.Nv.baseActive),
                this.activeSlideIndex = -1,
                this.activeSlideData = this.slidesData[C.tT.initialSlideIndex],
                this.updateActiveSlide(),
                this.toggleSliderA11yAttributes(!1),
                (0,
                c.HI)(this.previous, !1),
                (0,
                c.HI)(this.next, !1),
                this.options.hasGradients && ((0,
                c.ZA)(this.gradientLeft, !1),
                (0,
                c.ZA)(this.gradientRight, !1))
            }
        }
    }
    ,
    8201: (t, e, i) => {
        i.d(e, {
            s: () => s
        });
        var n = i(45876);
        function s(t) {
            return (0,
            n.r)(t.map(t => new Promise( (e, i) => {
                t.complete && 0 !== t.naturalWidth ? e() : (t.addEventListener("load", e, {
                    once: !0
                }),
                t.addEventListener("error", i, {
                    once: !0
                }))
            }
            )))
        }
    }
    ,
    8680: (t, e, i) => {
        i.d(e, {
            Fv: () => n,
            Rj: () => a,
            SS: () => o,
            T: () => s
        });
        const n = "CHF"
          , s = {
            abbreviation: n,
            abbreviationFirst: !0,
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
            useGrouping: !0
        }
          , o = {
            abbreviation: n,
            abbreviationFirst: !0,
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
            useGrouping: !0
        }
          , a = {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
            useGrouping: !1
        }
    }
    ,
    9537: (t, e, i) => {
        function n(t, e, i=!0, n=!0) {
            const s = t || 0
              , o = {
                language: e.language ?? navigator.language,
                useGrouping: !1 !== e.useGrouping || !0,
                abbreviationFirst: e.abbreviationFirst,
                minimumFractionDigits: n ? e.minimumFractionDigits : 0,
                maximumFractionDigits: n ? e.maximumFractionDigits : 0
            };
            s % 1 != 0 && (o.minimumFractionDigits = o.maximumFractionDigits);
            const a = s.toLocaleString(o.language, {
                minimumFractionDigits: o.minimumFractionDigits,
                maximumFractionDigits: o.maximumFractionDigits,
                useGrouping: o.useGrouping
            });
            return i ? o.abbreviationFirst ? `${e.abbreviation} ${a}` : `${a} ${e.abbreviation}` : a
        }
        i.d(e, {
            v: () => n
        })
    }
    ,
    11992: (t, e, i) => {
        function n(t) {
            return new Map(Object.entries(t))
        }
        i.d(e, {
            t: () => n
        })
    }
    ,
    12458: (t, e, i) => {
        i.d(e, {
            W: () => n
        });
        const n = {
            gridContextAttribute: "data-gridcontext-context",
            gridContextNameAttribute: "data-gridcontext-name",
            dateInputRuleInvalidDates: "data-rule-invaliddates",
            dateInputMessageMin: "data-msg-min",
            dateInputMessageMax: "data-msg-max",
            min: "min",
            max: "max",
            segment: "data-segment",
            dataNc: "data-nc",
            lofiPath: "data-lofi-path"
        }
    }
    ,
    12953: (t, e, i) => {
        i.d(e, {
            N3: () => s,
            $y: () => a
        });
        var n = i(22459);
        function s(t, e=!0) {
            t.toggleAttribute("disabled", e)
        }
        var o = i(1205);
        function a(t, e=!0) {
            const i = t.querySelectorAll(o.F.newRadioInput);
            t.classList.remove(n.l.newFormFieldDisabled),
            i.forEach(t => {
                t.toggleAttribute("disabled", e)
            }
            )
        }
    }
    ,
    13655: (t, e, i) => {
        function n(t=".", e=window.location) {
            const {hostname: i} = e;
            return /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi.test(i) ? i : `${t}${i.split(".").slice(-2).join(".")}`
        }
        i.d(e, {
            X: () => n
        })
    }
    ,
    14113: (t, e, i) => {
        i.d(e, {
            By: () => o,
            R2: () => s,
            pZ: () => n
        });
        const n = {
            openDialog: "privacy-settings-dialog-opened",
            closeDialog: "privacy-settings-dialog-closed",
            openBanner: "privacy-settings-banner-opened",
            closeBanner: "privacy-settings-banner-closed",
            bannerStatusChanged: "privacy-settings-banner-status-changed",
            updateUserPreferences: "privacy-settings-user-preferences-update-requested",
            updateAllUserPreferences: "privacy-settings-all-preferences-update-requested",
            userPreferencesUpdated: "privacy-settings-user-preferences-updated",
            permissionsStatesUpdated: "privacy-settings-permissions-states-updated"
        }
          , s = {
            toggleTracking: "tracking-toggled"
        }
          , o = {
            msDynamicFormLoadCompleted: "d365mkt-afterformload",
            msDynamicFormSubmitted: "d365mkt-afterformsubmit",
            nnFormSuccess: "nnFormSuccess",
            nnFormSubmit: "nnFormSubmit"
        }
    }
    ,
    14672: (t, e, i) => {
        i.d(e, {
            h: () => n
        });
        class n {
            constructor(t, e) {
                this.element = t,
                this.observerFirstFireDone = !1,
                this.observer = new IntersectionObserver(t => {
                    this.observerFirstFireDone ? t[0].intersectionRatio > 0 ? e?.onShow?.() : e?.onHide?.() : this.observerFirstFireDone = !0
                }
                ,{
                    root: document.body
                })
            }
            observe() {
                this.observerFirstFireDone = !1,
                this.observer.observe(this.element)
            }
            unobserve() {
                this.observer.unobserve(this.element)
            }
        }
    }
    ,
    15369: (t, e, i) => {
        function n(t="") {
            return "string" != typeof t || 0 === t.length ? "" : t.charAt(0).toUpperCase() + t.slice(1)
        }
        i.d(e, {
            c: () => n
        })
    }
    ,
    16935: (t, e, i) => {
        i.d(e, {
            c: () => o
        });
        var n = i(53783)
          , s = i(53364);
        class o {
            constructor(t, e) {
                this.likeButton = t.likeButton,
                this.likeIcon = t.likeIcon,
                this.options = {
                    storageKey: "",
                    wasLikedIconClass: "",
                    analyticsData: {},
                    ...e
                },
                this.localStorageKey = window.location.pathname,
                this.wasLiked = !!nn.webstorage.getStorage(this.options.storageKey)?.[this.localStorageKey],
                this.handleLike = this.handleLike.bind(this),
                this.wasLiked && this.setVisibleLikeIcon(),
                this.addEventListeners()
            }
            setVisibleLikeIcon() {
                this.wasLiked ? this.likeIcon.classList.add(this.options.wasLikedIconClass) : this.likeIcon.classList.remove(this.options.wasLikedIconClass)
            }
            trackLike() {
                this.wasLiked && (0,
                n.vU)(this.options.analyticsData)
            }
            handleLike() {
                this.setLikedState(!this.wasLiked),
                this.trackLike(),
                s.Gd.publish(s.Nz.likeButton.stateChange, {
                    wasLiked: this.wasLiked,
                    instance: this
                })
            }
            addEventListeners() {
                this.likeButton?.addEventListener("click", this.handleLike)
            }
            setLikedState(t) {
                this.wasLiked = t,
                this.setVisibleLikeIcon(),
                this.setLocalStorage()
            }
            setLocalStorage() {
                const t = nn.webstorage.getStorage(this.options.storageKey) || {};
                t[this.localStorageKey] = this.wasLiked,
                nn.webstorage.setStorage(this.options.storageKey, t)
            }
        }
    }
    ,
    18923: (t, e, i) => {
        i.d(e, {
            i: () => s
        });
        var n = i(57563);
        class s {
            constructor(t, e) {
                this.el = t,
                this.uuid = t.uuid,
                this.options = e || {},
                this.baseClass = e.baseClass || `animate__${e.animationType}`,
                this.observer = this.options.rootMargin ? new n.IO(this.options.rootMargin) : n.wl,
                this.fade = this.fade.bind(this),
                this.init()
            }
            init() {
                const t = window.innerWidth >= 1024
                  , {forceAnimation: e} = this.options;
                if (t || e) {
                    const t = this.getCallback();
                    this.observer.observe(this.el, t, this.uuid)
                }
            }
            getCallback() {
                return this.fade
            }
            fade(t) {
                const {animateChildren: e, showOnVisible: i, callback: n} = this.options
                  , {target: s} = t
                  , {children: o} = s;
                this.isVisible(t) ? (e ? this.animateChildren(o) : (n && n(),
                this.addClass(s)),
                this.observer.unobserve(s)) : i && (e ? [...o].forEach(t => {
                    this.addClass(t, "hidden")
                }
                ) : (n && n(),
                this.addClass(this.el, "hidden")))
            }
            animateDelayChildren(t) {
                let e = 0;
                [...t].forEach(t => {
                    window.setTimeout( () => {
                        this.addClass(t)
                    }
                    , e),
                    e += this.options.delay
                }
                )
            }
            animateChildren(t) {
                const {delay: e, callback: i} = this.options;
                e ? this.animateDelayChildren(t) : [...t].forEach(t => {
                    i && i(),
                    this.addClass(t)
                }
                )
            }
            addClass(t, e) {
                const {animationType: i} = this.options
                  , n = e || i;
                t.classList.add(`${this.baseClass}-is-${n}`)
            }
            isVisible(t) {
                return t.intersectionRatio > 0
            }
        }
    }
    ,
    19566: (t, e, i) => {
        function n() {
            return (new Date).toISOString()
        }
        function s(t, e, ...i) {
            t.unshift({
                functionName: e,
                timestamp: n(),
                arguments: i
            })
        }
        i.d(e, {
            Rg: () => r,
            AJ: () => l,
            Z2: () => s,
            lg: () => n
        });
        var o = i(7209)
          , a = i(51967);
        function r(t) {
            const e = t.pop();
            if (e) {
                const t = function(t) {
                    const e = t.split(".");
                    let i = window;
                    return e.forEach(t => {
                        i && (i = i[t])
                    }
                    ),
                    (0,
                    o.T)(i) ? i : (0,
                    a.OP)(function(t) {
                        return `Launch tracking function "${t}" is not found`
                    }(t))
                }(e.functionName);
                (0,
                o.T)(t) && t(...e.arguments, e.timestamp)
            }
        }
        function l(t) {
            for (; t.length; )
                r(t)
        }
    }
    ,
    20495: (t, e, i) => {
        function n(t) {
            return Array.isArray(t)
        }
        i.d(e, {
            c: () => n
        })
    }
    ,
    20613: (t, e, i) => {
        i.d(e, {
            O: () => n
        });
        const n = {
            mainContentStartPosition: "--main-content-start-position",
            mainStickyHeaderHeight: "--main-sticky-header-height"
        }
    }
    ,
    20995: (t, e, i) => {
        function n(t) {
            return Object.keys(t).forEach(e => {
                "" === t[e] && delete t[e]
            }
            )
        }
        i.d(e, {
            K: () => n
        })
    }
    ,
    21030: (t, e, i) => {
        i.d(e, {
            f: () => n
        });
        const n = {
            down: "ArrowDown",
            enter: "Enter",
            esc: "Escape",
            end: "End",
            home: "Home",
            left: "ArrowLeft",
            right: "ArrowRight",
            shift: "Shift",
            space: " ",
            spaceIE: "Spacebar",
            up: "ArrowUp",
            tab: "Tab",
            delete: "Delete",
            backspace: "Backspace"
        }
    }
    ,
    21901: (t, e, i) => {
        function n(t) {
            return t.replace(/([-[\]{}()*+?.,\\/^$|#])/giu, "")
        }
        i.d(e, {
            e: () => n
        })
    }
    ,
    22459: (t, e, i) => {
        i.d(e, {
            l: () => n
        });
        const n = {
            hasStickyHeader: "hasStickyHeader",
            innerGridCell: "innergrid__cell",
            isHidden: "is-hidden",
            isNoJsInvisible: "is-no-js--invisible",
            mainNavigationListFirstLevel: "mainnavigation__list--firstLevel",
            newDropdownSelect: "newdropdown__select",
            newFormDateInput: "newinputtext__input--date",
            newFormFieldDisabled: "newform__field--disabled",
            newFormInput: "newinputtext__input",
            newFormInvalidField: "newform__field-is-error",
            newFormInvalidInput: "newinputtext__input-is-error",
            newFormInvalidSelect: "newdropdown__select-is-error",
            newRadioBase: "newradio__base",
            newRadioInput: "newradio__input",
            primaryHeaderBase: "primaryheader__base",
            genericLink: "link-v1__base",
            genericLinkActive: "link-v1__base--active",
            genericTitle: "title-v2__base",
            genericTitleLink: "title-v2__link",
            genericTitleLinkActive: "title-v2__link--active",
            genericLinkList: "linklist-v2__list",
            genericTeaserLink: "teaser-v2__link",
            primaryHeaderMainWrapper: "primaryheader__mainWrapper",
            searchField: "searchbox__inputField",
            siteTitleLink: "sitetitle__link",
            siteTitleLinkActive: "sitetitle__link--active",
            skeletonLoadingItem: "skeletonloading__item",
            gridControl2Cell: "gridcontrol2__cell",
            pageHeadArticleStickyHeader: "pageheadarticle__stickyheader"
        }
    }
    ,
    22953: (t, e, i) => {
        i.d(e, {
            a: () => s
        });
        var n = i(88835);
        function s(t, {maxValue: e}) {
            return (0,
            n.E)(t) && t <= e
        }
    }
    ,
    23290: (t, e, i) => {
        i.d(e, {
            d: () => s,
            f: () => o
        });
        var n = i(19566);
        class s {
            static instance = null;
            static getInstance() {
                return s.instance || (s.instance = new s,
                window.nc ??= {},
                window.nc.launchTracking ??= s.instance),
                s.instance
            }
            constructor() {
                this.queue = [],
                this.#t()
            }
            call(t, ...e) {
                window.nn?.launch?.trackingAllowed && this.#e(t, ...e)
            }
            forceCall(t, ...e) {
                this.#e(t, ...e)
            }
            #e(t, ...e) {
                (0,
                n.Z2)(this.queue, t, ...e),
                window.nn?.launch?.allModulesInitialised && (0,
                n.Rg)(this.queue)
            }
            #t() {
                window.nn?.launch?.allModulesInitialised || window.addEventListener("nnLaunchAllModulesInitialised", n.AJ.bind(null, this.queue), {
                    once: !0
                })
            }
        }
        function o() {
            s.getInstance()
        }
    }
    ,
    23601: (t, e, i) => {
        i.d(e, {
            Q7: () => a
        });
        const n = {
            empty: "EMPTY",
            invalidLength: "INVALID_LENGTH",
            invalidPrefix: "INVALID_PREFIX"
        };
        function s(t, e=null) {
            return {
                isValid: t,
                errorCode: e
            }
        }
        const o = {
            "+41": {
                name: "Switzerland",
                mobilePrefixes: ["075", "076", "077", "078", "079"],
                length: 9,
                allowWithoutLeadingZero: !0
            }
        };
        function a(t, e) {
            const i = s(!0);
            if (!o[t])
                return i;
            const a = o[t]
              , r = e.replace(/\s+/g, "");
            return r ? function(t, e) {
                let i = t
                  , o = !1;
                if (t.startsWith("0") && (i = t.substring(1),
                o = !0),
                i.length !== e.length)
                    return s(!1, n.invalidLength);
                const a = i.substring(0, 2)
                  , r = o ? `0${a}` : a;
                return e.mobilePrefixes.some(t => {
                    const i = r === t
                      , n = e.allowWithoutLeadingZero && a === t.substring(1);
                    return i || n
                }
                ) ? s(!0) : s(!1, n.invalidPrefix)
            }(r, a) : s(!1, n.empty)
        }
    }
    ,
    25965: (t, e, i) => {
        function n(t, e=window.nc?.loaderInstances) {
            let i = null;
            return Object.values(e).forEach(e => {
                if (Array.isArray(e)) {
                    const n = e.find(e => e.el === t);
                    n && (i = n)
                }
            }
            ),
            i
        }
        i.d(e, {
            p: () => n
        })
    }
    ,
    26113: (t, e, i) => {
        i.d(e, {
            O: () => r,
            L: () => l
        });
        const n = {
            "Content-Type": "application/json"
        }
          , s = Object.freeze({
            all: "all",
            article: "article",
            news: "news",
            page: "page",
            funds: "funds",
            people: "people",
            event: "event",
            noFunds: "no_funds"
        })
          , o = t => {
            if (!t)
                return 0;
            try {
                const [e] = t.split('<span id="')[1].split('"');
                return Number.parseInt(e, 10)
            } catch (t) {
                return 0
            }
        }
          , a = ({label: t, value: e}) => ({
            displayOrder: o(t),
            label: t,
            value: e
        })
          , r = async ({appId: t, apiKey: e, autosuggestApiEndpoint: i, languages: s, country: o, includePaths: r, excludePaths: l, query: c, roleVisibility: d, ubsCategories: h, operation: u}={}) => {
            if (!c)
                return [];
            if (!i)
                throw new Error("getAutosuggestResultsFromCaas: no apiEndpoint was provided");
            const p = {
                country: o,
                languages: s,
                includePaths: r,
                excludePaths: l,
                searchQuery: c,
                roleVisibility: d,
                ubsCategories: h,
                operation: u
            }
              , m = {
                method: "POST",
                headers: {
                    ...n,
                    "X-APP-Id": t,
                    "X-API-Key": e
                },
                body: JSON.stringify(p)
            }
              , g = await fetch(i, m);
            let b = await g.json() || {
                autocomplete: []
            };
            return b.autocomplete ? b.autocomplete.map(a) : (b = [b],
            b.map(a))
        }
          , l = async ({appId: t, apiKey: e, apiEndpoint: i, contentTypes: o, language: a, shouldAddPaths: r=!0, includePaths: l, excludePaths: c, maxCountOfResults: d, offset: h=0, category: u, isAutocorrectDisabled: p=!1, query: m, chosenLanguages: g, country: b, roleVisibility: f, searchMode: v, ubsCategories: w}={}) => {
            if (!i)
                throw new Error("getSearchResultsFromCaas: no apiEndpoint was provided");
            const S = {
                ...n,
                "X-APP-Id": t,
                "X-API-Key": e
            }
              , y = u === s.all || !u.length > 0
              , C = {
                contentTypes: o,
                language: a,
                maxResult: d,
                offset: h,
                searchQuery: m,
                selectedLanguages: g,
                country: b,
                categoryTab: u,
                autocorrect: !p,
                roleVisibility: f,
                ubsCategories: w,
                searchMode: v
            };
            r ? (C.includePaths = l,
            C.excludePaths = c,
            l.length > 0 ? C.enableHero = y : C.enableHero = !1) : C.enableHero = !0;
            const A = {
                method: "POST",
                headers: S,
                body: JSON.stringify(C)
            }
              , E = await fetch(i, A);
            return await E.json()
        }
    }
    ,
    27339: (t, e, i) => {
        i.d(e, {
            c: () => n
        });
        const n = {
            switzerland: `${i(77639).q.switzerland}+41`
        }
    }
    ,
    29960: (t, e, i) => {
        i.d(e, {
            Of: () => a,
            nD: () => f
        });
        var n = i(39318)
          , s = i(38563);
        const o = "accordion-util"
          , a = {
            section: `${o}__section`,
            sectionStateCollapsed: `${o}__section--stateCollapsed`,
            sectionStateExpanded: `${o}__section--stateExpanded`,
            sectionStateTransition: `${o}__section--stateTransition`,
            sectionHeader: `${o}__sectionHeader`,
            sectionContent: `${o}__sectionContent`,
            accordionOpenAll: `${o}__openall`
        }
          , r = {
            sections: `.${a.section}`,
            sectionHeaders: `.${a.sectionHeader}`,
            sectionContents: `.${a.sectionContent}`
        }
          , l = {
            expanded: Symbol("expanded"),
            collapsed: Symbol("collapsed")
        }
          , c = {
            auto: Symbol("auto"),
            skip: Symbol("skip")
        };
        var d = i(53211)
          , h = i(92478)
          , u = i(67474)
          , p = i(21030)
          , m = i(35327)
          , g = i(33579);
        class b {
            constructor(t, e) {
                const {selectors: i, classes: n, environment: s, callbacks: o, behavior: c} = e || {};
                this.elements = {
                    section: t
                },
                this.selectors = {
                    header: r.sectionHeaders,
                    content: r.sectionContents,
                    ...i
                },
                this.classes = {
                    sectionStateCollapsed: a.sectionStateCollapsed,
                    sectionStateExpanded: a.sectionStateExpanded,
                    sectionStateTransition: a.sectionStateTransition,
                    ...n
                },
                this.sectionStateClassesMap = new Map([[l.expanded, [this.classes.sectionStateExpanded]], [l.collapsed, [this.classes.sectionStateCollapsed]]]),
                this.environment = s,
                this.callbacks = o,
                this.behavior = {
                    allowUserCloseSection: !0,
                    forceExpandInViewport: !0,
                    ...c
                },
                this.state = void 0,
                this.animationManager = void 0,
                this.shouldAutoScroll = void 0,
                this.onHeaderClick = this.onHeaderClick.bind(this),
                this.onHeaderKeydown = this.onHeaderKeydown.bind(this),
                this.scrollIntoViewport = this.scrollIntoViewport.bind(this),
                this.onViewportChange = this.onViewportChange.bind(this),
                this.startTransitionUi = this.startTransitionUi.bind(this),
                this.endTransitionUi = this.endTransitionUi.bind(this),
                this.isSafari = /^Apple/.test(navigator.vendor) && /Safari/.test(navigator.userAgent),
                this.init()
            }
            getState() {
                return this.state
            }
            init() {
                this.setElements(),
                this.setAccessibilityAttributes(),
                this.initAnimationManager(),
                this.addEventListeners(),
                this.addViewportListener()
            }
            setElements() {
                this.elements.header = this.elements.section.querySelector(this.selectors.header),
                this.elements.content = this.elements.section.querySelector(this.selectors.content)
            }
            initAnimationManager() {
                this.animationManager = new d.s(this.elements.section,{
                    animationTrigger: this.startTransitionUi,
                    onEnd: this.endTransitionUi
                })
            }
            addEventListeners() {
                this.elements.header.addEventListener("click", this.onHeaderClick),
                this.elements.header.addEventListener("keydown", this.onHeaderKeydown)
            }
            onHeaderClick() {
                this.environment?.accordionIsEnabled?.() && this.toggleState(this.behavior.forceExpandInViewport)
            }
            onHeaderKeydown(t) {
                if (t.key === p.f.enter || t.key === p.f.space) {
                    if (t.preventDefault(),
                    !this.environment?.accordionIsEnabled?.())
                        return;
                    this.toggleState(this.behavior.forceExpandInViewport)
                }
            }
            readStateFromDom() {
                return this.elements.section.classList.contains(this.classes.sectionStateExpanded) ? l.expanded : l.collapsed
            }
            toggleState(t) {
                this.state === l.expanded ? this.behavior.allowUserCloseSection && this.setState(l.collapsed) : this.setState(l.expanded, c.auto, t)
            }
            setState(t, e, i) {
                this.state !== t && (this.state = t,
                e !== c.skip && this.updateStateUi(!1, i),
                this.callbacks?.onStateChange?.(this, e))
            }
            setAccessibilityAttributes() {
                (0,
                u.F)(this.elements.content, !1)
            }
            updateStateUi(t, e) {
                const i = this.sectionStateClassesMap.get(this.state);
                this.elements.section.classList.remove(...[...this.sectionStateClassesMap].filter(t => t[0] !== this.state).map(t => t[1]).flat()),
                this.elements.section.classList.add(...i),
                t ? this.animationManager.abort() : this.animationManager.run({
                    onEnd: e ? this.scrollIntoViewport : void 0
                }),
                null !== this.elements.header.ariaExpanded && (this.elements.header.ariaExpanded = `${this.state === l.expanded}`),
                (0,
                u.F)(this.elements.content, this.state !== l.collapsed),
                this.elements.content.toggleAttribute(m.vj.hidden, this.state === l.collapsed)
            }
            addViewportListener() {
                n.F.update(this.onViewportChange, {
                    triggerOnInit: !0
                })
            }
            onViewportChange(t) {
                this.shouldAutoScroll = t.current.breakpoint < g.LO.m
            }
            scrollIntoViewport() {
                if (!this.shouldAutoScroll)
                    return;
                const t = () => {
                    (0,
                    h.$v)(this.elements.section, {
                        behavior: "smooth",
                        block: "nearest"
                    })
                }
                ;
                this.isSafari ? setTimeout(t, 300) : t()
            }
            startTransitionUi() {
                this.elements.section.classList.add(this.classes.sectionStateTransition)
            }
            endTransitionUi() {
                this.elements.section.classList.remove(this.classes.sectionStateTransition)
            }
        }
        class f {
            constructor(t, e) {
                const {selectors: i, classes: n, behavior: s, texts: o, callbacks: a} = e || {};
                this.elements = {
                    accordion: t
                },
                this.selectors = {
                    sections: i?.sections ?? r.sections,
                    toggleAll: i?.toggleAll ?? void 0
                },
                this.behavior = {
                    allowOpenSeveralSections: !1,
                    ...s || {}
                },
                this.state = {
                    initialized: !1,
                    enabled: !1,
                    allSectionsExpanded: !1,
                    allSectionsCollapsed: !1
                },
                this.environment = {
                    accordionIsEnabled: () => this.state.enabled
                },
                this.callbacks = a,
                this.texts = o,
                this.paramsCache = {
                    selectors: i,
                    classes: n,
                    behavior: s
                },
                this.onViewportChange = this.onViewportChange.bind(this),
                this.onSectionStateChange = this.onSectionStateChange.bind(this),
                this.onToggleAllClick = this.onToggleAllClick.bind(this),
                this.behavior.enableOnlyInViewports ? this.setupViewportWatch() : this.enable()
            }
            setupViewportWatch() {
                n.F.update(this.onViewportChange, {
                    triggerOnInit: !0
                })
            }
            init() {
                this.setElements(),
                this.initSections(),
                this.initState(),
                this.addEventListeners(),
                this.updateUiState(!0)
            }
            setElements() {
                this.elements.toggleAllBtn = this.elements.accordion.querySelector(this.selectors.toggleAll)
            }
            addEventListeners() {
                this.elements.toggleAllBtn && (this.elements.toggleAllBtn.addEventListener("click", this.onToggleAllClick),
                (0,
                s.k)(this.state, "allSectionsExpanded", this.updateToggleAllBtn.bind(this)),
                (0,
                s.k)(this.state, "allSectionsCollapsed", this.updateToggleAllBtn.bind(this)))
            }
            onToggleAllClick() {
                const t = this.behavior.allowOpenSeveralSections;
                this.behavior.allowOpenSeveralSections = !0;
                const e = this.elements.toggleAllBtn.classList.contains(a.accordionOpenAll);
                this.toggleAllSections(e ? l.expanded : l.collapsed),
                this.behavior.allowOpenSeveralSections = t
            }
            updateToggleAllBtn() {
                const {allSectionsExpanded: t, allSectionsCollapsed: e} = this.state
                  , {toggleAllBtn: i} = this.elements;
                t ? (i.textContent = this.texts.collapseAllText,
                i.classList.remove(a.accordionOpenAll)) : e && (i.textContent = this.texts.expandAllText,
                i.classList.add(a.accordionOpenAll))
            }
            toggleAllSections(t) {
                this.sections.forEach(e => {
                    e.setState(t)
                }
                )
            }
            initSections() {
                const t = [...this.elements.accordion.querySelectorAll(this.selectors.sections)]
                  , {selectors: e, classes: i, behavior: n} = this.paramsCache;
                this.sections = t.map(t => new b(t,{
                    selectors: {
                        header: e?.sectionHeaders,
                        content: e?.sectionContents
                    },
                    classes: i,
                    environment: this.environment,
                    callbacks: {
                        onStateChange: this.onSectionStateChange
                    },
                    behavior: n
                }))
            }
            initState() {
                this.restoreState(c.skip)
            }
            onViewportChange(t) {
                this.behavior.enableOnlyInViewports && (this.behavior.enableOnlyInViewports?.includes(t.current.size) ? this.enable() : this.disable())
            }
            enable() {
                this.state.enabled || (this.state.initialized ? this.restoreState() : this.init(),
                this.state.enabled = !0)
            }
            disable() {
                this.state.enabled = !1
            }
            restoreState(t) {
                const e = this.readStateFromDom()
                  , i = e.filter(t => t === l.expanded).length > 1
                  , n = e.findIndex(t => t === l.expanded)
                  , s = !this.behavior.allowOpenSeveralSections && i;
                e.forEach( (t, i) => {
                    t === l.expanded && s && i > n && (e[i] = l.collapsed)
                }
                ),
                this.sections.forEach( (i, n) => {
                    i.setState(e[n], t)
                }
                )
            }
            readStateFromDom() {
                return this.sections.map(t => t.readStateFromDom())
            }
            onSectionStateChange(t, e) {
                const i = t.getState() === l.expanded;
                i && !this.behavior.allowOpenSeveralSections && this.sections.filter(e => e !== t).forEach(t => {
                    t.setState(l.collapsed, e)
                }
                ),
                this.setAllSectionsStatus(i),
                this.callbacks?.onSectionStatusChange(t, i, e !== c.skip)
            }
            setAllSectionsStatus(t) {
                t ? (this.state.allSectionsExpanded = this.sections.every(t => t.getState() === l.expanded),
                this.state.allSectionsCollapsed = !1) : (this.state.allSectionsExpanded = !1,
                this.state.allSectionsCollapsed = this.sections.every(t => t.getState() === l.collapsed))
            }
            updateUiState(t) {
                this.sections.forEach(e => {
                    e.updateStateUi(t)
                }
                )
            }
        }
    }
    ,
    30207: (t, e, i) => {
        function n(t, e=window.location.pathname, i=window.location.origin) {
            const n = t => t.replace(/\.html/g, "").replace(/\/$/g, "")
              , s = n(new URL(e,i).pathname)
              , o = n(new URL(t,i).pathname);
            return s.startsWith(`${o}/`)
        }
        i.d(e, {
            E: () => n
        })
    }
    ,
    33195: (t, e, i) => {
        function n(t, e, i, n) {
            t.classList.add(`${e}${i}`),
            n || t.classList.remove(e)
        }
        function s(t, e, i=!1, s="") {
            if (!t?.length)
                return;
            const o = `--${e}`;
            [...t].forEach(t => {
                const e = [...t.classList].filter(t => !t.includes("js-"));
                e.length && function(t, e, i=!1, s="", o=[]) {
                    t && e && "" !== e && ("string" != typeof s || "" === s ? (o.length ? o : t.classList.value.split(" ")).forEach(s => n(t, s, e, i)) : n(t, s, e, i))
                }(t, o, i, s, e)
            }
            )
        }
        i.d(e, {
            $: () => s
        })
    }
    ,
    33579: (t, e, i) => {
        i.d(e, {
            FN: () => o,
            LO: () => s,
            SD: () => n
        });
        const n = {
            xs: "xs",
            s: "s",
            m: "m",
            l: "l",
            xl: "xl"
        }
          , s = {
            [n.xs]: 0,
            [n.s]: 768,
            [n.m]: 1024,
            [n.l]: 1280,
            [n.xl]: 1440
        }
          , o = {
            ...s,
            [n.xs]: 320
        }
    }
    ,
    33747: (t, e, i) => {
        function n(t) {
            const e = null !== t
              , i = !Array.isArray(t)
              , n = !(t instanceof Date);
            return "object" == typeof t && e && i && n
        }
        i.d(e, {
            G: () => n
        })
    }
    ,
    34082: (t, e, i) => {
        i.d(e, {
            $z: () => o,
            IH: () => l,
            JY: () => n,
            bo: () => s,
            ts: () => a,
            u1: () => r
        });
        const n = "/content/sites"
          , s = "countryCode"
          , o = "languageCode"
          , a = "intCampID"
          , r = Object.freeze({
            [s]: 3,
            [o]: 4
        })
          , l = Object.freeze({
            [s]: 1,
            [o]: 2
        })
    }
    ,
    34902: (t, e, i) => {
        i.d(e, {
            c: () => n
        });
        const n = {
            nonTabbable: -1,
            tabbable: 0
        }
    }
    ,
    35327: (t, e, i) => {
        i.d(e, {
            aw: () => a,
            fn: () => r,
            ul: () => o,
            vj: () => s
        });
        var n = i(83391);
        const s = {
            ariaControls: "aria-controls",
            ariaCurrent: "aria-current",
            ariaExpanded: "aria-expanded",
            ariaHidden: "aria-hidden",
            ariaLabel: "aria-label",
            ariaLabelledBy: "aria-labelledby",
            ariaDescribedBy: "aria-describedby",
            ariaModal: "aria-modal",
            ariaSelected: "aria-selected",
            ariaChecked: "aria-checked",
            ariaInvalid: "aria-invalid",
            role: "role",
            tabIndex: "tabindex",
            hidden: "hidden"
        }
          , o = {
            tabbingEnabledElements: 'a[href], button:not([disabled]), input, textarea, label, select, details, audio, video, *[tabindex="0"]',
            tabbingDisabledElements: '*[tabindex="-1"]',
            tabbingEnabledAnchors: "a[href]"
        }
          , a = {
            noFocus: "no-focus",
            tabbableElement: "tabbable-element"
        }
          , r = {
            [n.Z4.asc]: "ascending",
            [n.Z4.desc]: "descending"
        }
    }
    ,
    35491: (t, e, i) => {
        function n(t, e, i=!1) {
            const n = {};
            return e.forEach(e => {
                (Object.prototype.hasOwnProperty.call(t, e) || i) && (n[e] = t[e])
            }
            ),
            n
        }
        i.d(e, {
            k: () => n
        })
    }
    ,
    35774: (t, e, i) => {
        i.d(e, {
            Y: () => s
        });
        var n = i(51967);
        async function s(t, e={}) {
            try {
                const i = await fetch(t, e);
                if (!i.ok)
                    return (0,
                    n.yA)(`Error while fetching HTML. Status code is not OK: ${i.status} - ${i.statusText}`),
                    {
                        success: !1,
                        response: i
                    };
                const s = await i.text();
                return {
                    success: !0,
                    response: i,
                    html: (new DOMParser).parseFromString(s, "text/html")
                }
            } catch (t) {
                return (0,
                n.yA)(`Error while fetching HTML: ${t.message}`),
                {
                    success: !1
                }
            }
        }
    }
    ,
    37367: (t, e, i) => {
        function n(t, e=!0) {
            return e ? /^\+?\d[\d ]*$/.test(t) : /^\d[\d ]*$/.test(t)
        }
        i.d(e, {
            g: () => n
        })
    }
    ,
    37571: (t, e, i) => {
        i.d(e, {
            m: () => n
        });
        const n = t => {
            let e = !1;
            return function(...i) {
                e || (e = !0,
                t.apply(this, i))
            }
        }
    }
    ,
    38108: (t, e, i) => {
        i.d(e, {
            CK: () => n.C,
            wM: () => o,
            WE: () => a,
            Mi: () => r,
            e9: () => l,
            Aj: () => h,
            Xk: () => c.X,
            rn: () => d,
            AD: () => u,
            my: () => p,
            AS: () => m,
            Hf: () => g,
            tb: () => b,
            AY: () => f,
            du: () => v
        });
        var n = i(73247)
          , s = i(34082);
        function o(t) {
            return g(t) ? {
                [s.bo]: s.u1[s.bo],
                [s.$z]: s.u1[s.$z]
            } : {
                [s.bo]: s.IH[s.bo],
                [s.$z]: s.IH[s.$z]
            }
        }
        function a(t=window.location.pathname) {
            const {countryCode: e} = o(t);
            return t.split("/")[e]
        }
        function r(t=window.location.pathname) {
            const {languageCode: e} = o(t);
            return t.split("/")[e]
        }
        function l() {
            return window.digitalData?.page?.pageInfo?.language || "en"
        }
        var c = i(13655);
        function d(t=window.location.href) {
            const e = t.split("/")
              , i = e[e.length - 1].split(".")
              , n = [];
            return ["noheader", "onlycontent"].forEach(t => {
                i.includes(t) && n.push(`.${t}`)
            }
            ),
            n.join("")
        }
        function h(t) {
            if (!t)
                return "";
            if (t.startsWith("/"))
                return t;
            try {
                const e = new URL(t);
                return e.pathname + e.search + e.hash
            } catch (e) {
                return t
            }
        }
        function u(t=window.location) {
            const e = t.origin.includes("ubs.com");
            if (e)
                return {
                    debug: !1,
                    ignoreCampaign: !1,
                    isProduction: e,
                    prefill: !1,
                    scenario: null,
                    stepName: null
                };
            const i = new URLSearchParams(t.search);
            return {
                debug: "true" === i.get("debug"),
                ignoreCampaign: "true" === i.get("ignoreCampaign"),
                isProduction: e,
                prefill: "true" === i.get("prefill"),
                scenario: i.get("scenario"),
                stepName: i.get("step")
            }
        }
        function p(t, e) {
            const i = ".html";
            return t.replace(i, `${e}${i}`)
        }
        function m(t=window.location) {
            return g(t.pathname)
        }
        function g(t) {
            return 0 === t.indexOf(s.JY)
        }
        function b(t, e=window.location) {
            if (t.startsWith("/"))
                return !1;
            const {hostname: i} = e;
            return new URL(t).hostname !== i
        }
        function f(t) {
            try {
                return Boolean(new URL(t))
            } catch (t) {
                return !1
            }
        }
        function v(t, e) {
            const i = new URL(t);
            return i.searchParams.delete(e),
            i.toString()
        }
    }
    ,
    38327: (t, e, i) => {
        function n(t=window.digitalData?.page?.attributes?.pagePath) {
            return t?.replace(/\.html$/, "")
        }
        i.d(e, {
            j: () => n
        })
    }
    ,
    38349: (t, e, i) => {
        i.d(e, {
            N: () => n
        });
        const n = {
            isHidden: "is-hidden",
            isInvisible: "is-invisible",
            svgIconActive: "svgicon--active",
            isEmpty: "is-empty",
            isVisuallyHidden: "is-visuallyHidden"
        }
    }
    ,
    38563: (t, e, i) => {
        i.d(e, {
            k: () => s
        });
        var n = i(45721);
        function s(t, e, i) {
            if ((0,
            n.m)(t, e)) {
                let n = t[e];
                Object.defineProperty(t, e, {
                    get: () => n,
                    set(t) {
                        const s = n;
                        n = t,
                        s !== t && i(e, s, t)
                    }
                })
            }
        }
    }
    ,
    39318: (t, e, i) => {
        i.d(e, {
            F: () => a,
            T: () => r
        });
        var n = i(33579)
          , s = i(83391);
        const o = [{
            size: n.SD.xs,
            breakpoint: n.FN.xs
        }, {
            size: n.SD.s,
            breakpoint: n.FN.s
        }, {
            size: n.SD.m,
            breakpoint: n.FN.m
        }, {
            size: n.SD.l,
            breakpoint: n.FN.l
        }, {
            size: n.SD.xl,
            breakpoint: n.FN.xl
        }]
          , a = new class {
            constructor(t) {
                this.mqs = t,
                this.callBacks = [],
                this.mediaQueryList = [],
                this.currentBreakpoint = 0,
                this.previousBreakpoint = 0,
                this.minWidthRegExp = /min-width:\s*(\d+)/,
                this.checkBreakpointStatus = this.checkBreakpointStatus.bind(this),
                this.init()
            }
            init() {
                this.createMediaQueryList(),
                this.detectInitialBreakPoint(),
                this.addMediaQueryListListeners()
            }
            update(t= () => {}
            , e={}) {
                this.callBacks.push(t),
                e.triggerOnInit && this.firstTrigger(t)
            }
            unsubscribe(t) {
                this.callBacks = this.callBacks.filter(e => e !== t)
            }
            firstTrigger(t) {
                const e = {
                    current: {}
                };
                this.mqs.forEach(t => {
                    t.breakpoint === this.currentBreakpoint && (e.current = t)
                }
                ),
                t(e)
            }
            createMediaQueryList() {
                this.mqs.forEach( (t, e) => {
                    const i = t.breakpoint
                      , n = void 0 !== this.mqs[e + 1] ? `(min-width: ${i}px) and (max-width: ${this.mqs[e + 1].breakpoint - 1}px)` : `(min-width: ${i}px)`;
                    this.mediaQueryList.push(window.matchMedia(n))
                }
                )
            }
            detectInitialBreakPoint() {
                const t = window.innerWidth;
                this.mqs.forEach(e => {
                    e.breakpoint <= t && (this.currentBreakpoint = e.breakpoint)
                }
                )
            }
            addMediaQueryListListeners() {
                this.mediaQueryList.forEach(t => {
                    t.addListener(this.checkBreakpointStatus)
                }
                )
            }
            getBreakpointStatus(t) {
                const e = this.minWidthRegExp.exec(t)[1];
                return this.previousBreakpoint = this.currentBreakpoint,
                this.currentBreakpoint = parseInt(e, 10),
                {
                    current: this.mqs.filter(t => t.breakpoint === this.currentBreakpoint)[0],
                    from: this.mqs.filter(t => t.breakpoint === this.previousBreakpoint)[0]
                }
            }
            checkBreakpointStatus({matches: t, media: e}) {
                if (t) {
                    const t = this.getBreakpointStatus(e);
                    this.callBacks.forEach(e => {
                        e(t)
                    }
                    )
                }
            }
            getCurrentBreakpoint() {
                return this.currentBreakpoint
            }
        }
        (o)
          , r = function(t, e=s.mI) {
            return Object.keys(e).reduce( (i, n) => i || -1 === e[n].indexOf(t) ? i : n, null)
        }
    }
    ,
    42477: (t, e, i) => {
        i.d(e, {
            Mk: () => l,
            Ve: () => r,
            en: () => h,
            f7: () => c,
            pF: () => d,
            vw: () => u
        });
        var n = i(23290)
          , s = i(84597);
        const o = "nn.launch.module.formcoretracking"
          , a = n.d.getInstance();
        function r(t, e=(0,
        s.b)(window.location.pathname)) {
            return `${nn?.webstorage ? nn.webstorage.webStorageCatalogKeys.trackingParties.analytics.formcoreStart : "formcore_start"}-${t}-${e}`
        }
        function l(t, e=null) {
            if (!t)
                return;
            const i = {
                attributes: {
                    formName: t
                },
                timestamp: e
            };
            a.call(`${o}.trackFormReady`, i)
        }
        function c(t, e=null, i="", n=null) {
            if (!t)
                return;
            const s = {
                cookieName: e,
                attributes: {
                    formName: t,
                    formFieldId: i
                },
                timestamp: n
            };
            a.call(`${o}.trackFormStarted`, s)
        }
        function d(t, e, i="", n=null) {
            if (!t)
                return;
            const s = {
                attributes: {
                    formName: t,
                    formFieldId: i,
                    formStepNumber: e
                },
                timestamp: n
            };
            a.call(`${o}.trackFormFieldClicked`, s)
        }
        function h(t, e="") {
            if (!t)
                return;
            const i = {
                cookieValue: {
                    formName: t,
                    formAnswers: e ? `fa: ${e}` : ""
                }
            };
            a.call(`${o}.createFormSuccessCookies`, i)
        }
        function u(t, e, i, n, s=null) {
            if (!i || !t)
                return;
            const r = {
                attributes: {
                    formName: t,
                    formErrorMessage: i.validationMessage,
                    fieldWithErrors: `${i.name || i.id} (${e}-${n + 1})`
                },
                timestamp: s
            };
            a.call(`${o}.trackFormFieldError`, r)
        }
    }
    ,
    43138: (t, e, i) => {
        function n(t) {
            t.forEach( ({el: t, attributes: e}) => {
                Object.entries(e).forEach( ([e,i]) => {
                    t[e] = i
                }
                )
            }
            )
        }
        function s(t) {
            return t.forEach( ({el: t, attributes: e}) => {
                Object.keys(e).forEach(i => {
                    e[i] = t[i],
                    t[i] = null
                }
                )
            }
            ),
            t
        }
        function o(t) {
            return `${t[0] + 1}-${t[t.length - 1] + 1}`
        }
        i.d(e, {
            gf: () => n,
            sy: () => s,
            Ix: () => o,
            ZA: () => d,
            HI: () => c,
            DK: () => b
        });
        var a = i(35327)
          , r = i(66432)
          , l = i(53364);
        function c(t, e) {
            e ? function(t) {
                t?.classList.contains(r.Nv.actionHidden) && (t.classList.remove(r.Nv.actionHidden),
                t.removeAttribute(a.vj.ariaHidden),
                t.setAttribute(a.vj.tabIndex, "0"),
                t.removeAttribute(r.iw.focusOutlineExclude))
            }(t) : function(t) {
                t && !t.classList.contains(r.Nv.actionHidden) && (t.classList.add(r.Nv.actionHidden),
                t.setAttribute(a.vj.ariaHidden, "true"),
                t.setAttribute(a.vj.tabIndex, "-1"),
                document.activeElement === t && (l.Gd.publish(l.Nz.keyFocus.removeOutline),
                t.setAttribute(r.iw.focusOutlineExclude, "true")))
            }(t)
        }
        function d(t, e) {
            t.classList.toggle(r.Nv.gradientHidden, !e)
        }
        var h = i(23290);
        const u = "nn.launch.module.containercomponent.trackSliderNavigation"
          , p = h.d.getInstance()
          , m = {
            [r.Uj.nextArrow]: "arrow back toggle",
            [r.Uj.previousArrow]: "arrow next toggle",
            [r.Uj.otherIcon]: "slider icon toggle"
        }
          , g = [r.Uj.none, r.Uj.autoplayNext];
        function b(t, e, i) {
            if (t && !g.includes(e)) {
                const n = t.querySelector("[data-tracking-name]")
                  , s = n?.dataset.trackingName;
                s && p.call(u, {
                    action: i,
                    name: m[e],
                    title: s
                })
            }
        }
    }
    ,
    43651: (t, e, i) => {
        function n(t, e) {
            if (!(t instanceof Date))
                throw new Error("Invalid argument: date must be a Date object.");
            if ("number" != typeof e || !Number.isInteger(e))
                throw new Error("Invalid argument: minutes must be an integer number.");
            const i = new Date(t);
            return i.setTime(i.getTime() + 60 * e * 1e3),
            i
        }
        function s(t, e) {
            return new Date(t.getFullYear(),t.getMonth(),t.getDate()) - new Date(e.getFullYear(),e.getMonth(),e.getDate())
        }
        function o(t) {
            if ("number" != typeof t)
                throw new Error("Invalid argument: days must be a number.");
            return 1440 * t
        }
        function a(t) {
            if ("number" != typeof t)
                throw new Error("Invalid argument: seconds must be a number.");
            return t / 86400
        }
        function r(t=0, e=0, i=0, n=new Date) {
            return new Date(n.getFullYear() + t,n.getMonth() + e,n.getDate() + i)
        }
        function l(t=new Date) {
            const e = t => t.toString().padStart(2, "0");
            return [t.getFullYear(), e(t.getMonth() + 1), e(t.getDate())].join("-")
        }
        function c(t, e) {
            return s(t, e) > 0
        }
        function d(t, e) {
            return s(t, e) < 0
        }
        function h(t) {
            return s(t, new Date) > 0
        }
        function u(t, e) {
            return new Intl.DateTimeFormat(e,{
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(t)
        }
        i.d(e, {
            WO: () => n,
            iV: () => s,
            lP: () => o,
            NT: () => a,
            pp: () => r,
            Lv: () => l,
            $L: () => u,
            MO: () => g,
            j5: () => c,
            Rn: () => d,
            KZ: () => h
        });
        var p = i(38108);
        let m;
        function g(t, e="long", i=(0,
        p.e9)()) {
            return m ??= new Date(1970,1,1),
            m.setMonth(t),
            m.toLocaleString(i, {
                month: e
            })
        }
    }
    ,
    44254: (t, e, i) => {
        function n(t, e) {
            if (!Array.isArray(t) || !Array.isArray(e))
                throw new TypeError("Inputs must be arrays.");
            if (0 === t.length || 0 === e.length)
                throw new Error("Arrays cannot be empty.");
            if (t.length !== e.length)
                throw new Error("Input arrays must have the same length.");
            if (e.some(t => t < 0))
                throw new Error("Weights cannot be negative.");
            const i = e.reduce( (t, e) => t + e, 0);
            if (Math.abs(i - 1) > 1e-6)
                throw new Error("The sum of weights must be approximately 1.");
            if (![...t, ...e].every(t => "number" == typeof t))
                throw new TypeError("All array elements must be numbers.");
            let n = 0;
            for (let i = 0; i < t.length; i++)
                n += t[i] * e[i];
            return n
        }
        i.d(e, {
            L: () => n
        })
    }
    ,
    44507: (t, e, i) => {
        i.d(e, {
            h: () => a
        });
        var n = i(86787)
          , s = i(20495)
          , o = i(33747);
        function a(t) {
            return !function(t) {
                return void 0 === t
            }(t) && null !== t && ((0,
            n.K)(t) ? t.trim().length > 0 : (0,
            s.c)(t) ? t.length > 0 : !(0,
            o.G)(t) || Object.keys(t).length > 0)
        }
    }
    ,
    45548: (t, e, i) => {
        i.d(e, {
            L: () => n
        });
        const n = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    }
    ,
    45721: (t, e, i) => {
        function n(t, e) {
            return Object.prototype.hasOwnProperty.call(t, e)
        }
        i.d(e, {
            m: () => n
        })
    }
    ,
    45876: (t, e, i) => {
        function n(t) {
            if (!Promise.allSettled) {
                const e = t.map(t => t.then(t => ({
                    status: "fulfilled",
                    value: t
                })).catch(t => ({
                    status: "rejected",
                    reason: t
                })));
                return Promise.all(e)
            }
            return Promise.allSettled(t)
        }
        i.d(e, {
            r: () => n
        })
    }
    ,
    46430: (t, e, i) => {
        i.d(e, {
            I5: () => n,
            nl: () => o,
            xE: () => s
        });
        const n = 4
          , s = 13
          , o = {
            time: "time"
        }
    }
    ,
    46571: (t, e, i) => {
        i.d(e, {
            O: () => g,
            j: () => m
        });
        var n = i(51967)
          , s = i(20495);
        function o(t) {
            return t.split("-").map( (t, e) => {
                const i = 0 === e;
                let n = t.charAt(0);
                return i || (n = n.toUpperCase()),
                n + t.slice(1)
            }
            ).join("")
        }
        var a = i(82355);
        const r = "nc-"
          , l = {
            attr: `${r}attr`
        }
          , c = (0,
        a.Y)({
            script: ""
        })
          , d = (0,
        a.Y)({
            script: "",
            attribute: "",
            component: "",
            unsupported: ""
        });
        function h(t, e, i) {
            let {attributes: o} = i;
            if (o || (o = {},
            i.attributes = o),
            t.endsWith("[]")) {
                const a = t.replace("[]", "");
                let r = o[a];
                if (r && !(0,
                s.c)(r))
                    return void (0,
                    n.yA)(`Adding an array attribute '${a}' to an already existing non-array attribute is not supported`, i);
                r || (r = [],
                o[a] = r),
                r.push(e)
            } else
                o[t] = e
        }
        function u(t) {
            const e = {
                type: d.unsupported
            }
              , i = t.tagName?.toLowerCase() || "";
            return i ? i.startsWith(r) ? i === l.attr ? function(t) {
                const e = o(t.getAttribute("name"));
                let i = t.innerHTML.trim();
                switch (t.getAttribute("parser") || "string") {
                case "boolean":
                    i = i ? "true" === i : null;
                    break;
                case "number":
                    i = i ? Number(i) : null;
                    break;
                case "json":
                    i = i ? JSON.parse(i) : null
                }
                return {
                    type: d.attribute,
                    name: e,
                    value: i
                }
            }(t) : function(t) {
                const e = t.tagName.toLowerCase().replace(r, "").split("-").map(t => t.charAt(0).toUpperCase() + t.slice(1)).join("")
                  , i = {
                    type: d.component,
                    tag: e
                };
                return function(t, e) {
                    for (let i = 0; i < t.attributes.length; i++) {
                        const n = t.attributes.item(i);
                        h(o(n.name), n.value, e)
                    }
                }(t, i),
                i
            }(t) : i === c.script ? function(t) {
                const e = t.getAttribute("src");
                return {
                    type: d.script,
                    src: e
                }
            }(t) : e : e
        }
        function p(t, e=null) {
            const i = [];
            return [...t.children].forEach(t => {
                const s = u(t);
                switch (s.type) {
                case d.component:
                    if (i.push(s),
                    t.children.length) {
                        const e = p(t, s);
                        e.length > 0 && (s.children = e)
                    }
                    break;
                case d.script:
                    e.scriptSrc = s.src;
                    break;
                case d.attribute:
                    h(s.name, s.value, e);
                    break;
                default:
                    (0,
                    n.OP)(`Unsupported element <${t.tagName?.toLowerCase() || "no tag"}> found inside NC Template`, t)
                }
            }
            ),
            i
        }
        function m(t) {
            return p(t)
        }
        function g(t, e, i=new Map) {
            t.forEach(t => {
                !function(t, e, i) {
                    const {tag: n} = t
                      , s = e.get(n);
                    if (!n || !s || t.type !== d.component || t.attributes?.id)
                        return;
                    const o = i.get(s) || 0
                      , a = `${s}${o}`;
                    t.attributes || (t.attributes = {}),
                    t.attributes.id = a,
                    i.set(s, o + 1)
                }(t, e, i),
                t.children && g(t.children, e, i)
            }
            )
        }
    }
    ,
    47705: (t, e, i) => {
        i.d(e, {
            o: () => o
        });
        var n = i(51967)
          , s = i(38108);
        class o {
            constructor() {
                const t = window.SpeechRecognition || window.webkitSpeechRecognition;
                t ? (this.isSupported = !0,
                this.recognition = new t,
                this.recognition.lang = this.getLocaleLanguage() || navigator.language,
                this.recognition.continuous = !1,
                this.recognition.interimResults = !1,
                this.isListening = !1,
                this.onStart = () => {}
                ,
                this.onResult = () => {}
                ,
                this.onError = () => {}
                ,
                this.onEnd = () => {}
                ,
                this.onAudioStart = () => {}
                ,
                this.onAudioEnd = () => {}
                ,
                this.onSpeechStart = () => {}
                ,
                this.onSpeechEnd = () => {}
                ,
                this.recognition.onstart = () => {
                    this.isListening = !0,
                    this.onStart()
                }
                ,
                this.recognition.onresult = t => {
                    const {transcript: e} = t.results[0][0];
                    this.onResult(e)
                }
                ,
                this.recognition.onerror = t => {
                    this.recognition.stop(),
                    this.onError(t.error)
                }
                ,
                this.recognition.onaudiostart = () => {
                    this.onAudioStart()
                }
                ,
                this.recognition.onaudioend = () => {
                    this.onAudioEnd()
                }
                ,
                this.recognition.onspeechstart = () => {
                    this.onSpeechStart()
                }
                ,
                this.recognition.onspeechend = () => {
                    this.onSpeechEnd()
                }
                ,
                this.recognition.onend = () => {
                    this.isListening = !1,
                    this.onEnd()
                }
                ) : this.isSupported = !1
            }
            getLocaleLanguage() {
                const t = (0,
                s.e9)();
                if (t) {
                    const e = new Intl.Locale(t).maximize()
                      , {region: i, language: n} = e;
                    return i ? `${n}-${i}` : n
                }
                return navigator.language
            }
            start(t={}) {
                if (this.isSupported && !this.isListening) {
                    this.onStart = t.onStart || this.onStart,
                    this.onResult = t.onResult || this.onResult,
                    this.onError = t.onError || this.onError,
                    this.onEnd = t.onEnd || this.onEnd,
                    this.onAudioStart = t.onAudioStart || this.onAudioStart,
                    this.onAudioEnd = t.onAudioEnd || this.onAudioEnd,
                    this.onSpeechStart = t.onSpeechStart || this.onSpeechStart,
                    this.onSpeechEnd = t.onSpeechEnd || this.onSpeechEnd;
                    try {
                        this.recognition.start()
                    } catch (t) {
                        this.onError(t)
                    }
                }
            }
            stop() {
                this.isSupported && this.isListening && this.recognition.stop()
            }
            abort() {
                this.isSupported && this.isListening && this.recognition.abort()
            }
            onError(t) {
                (0,
                n.yA)(t)
            }
        }
    }
    ,
    47740: (t, e, i) => {
        i.d(e, {
            f: () => a
        });
        var n = i(51967)
          , s = i(74351);
        const o = "parentId";
        async function a({elements: t, wrapper: e, container: i, ...r}, l=0) {
            return new Promise(c => {
                if (l >= t.length)
                    return void c("Animation Completed");
                !function(t, e) {
                    const i = (0,
                    s.J)(4);
                    t.nodeType !== Node.TEXT_NODE && (t.dataset[o] = i + e)
                }(t[l], l);
                const d = t[l].childElementCount
                  , h = t[l].cloneNode(!d);
                if (e.appendChild(h),
                d) {
                    const e = [...t].splice(l + 1);
                    a({
                        elements: [...t[l].childNodes, ...e],
                        wrapper: h,
                        container: i,
                        ...r
                    }).then(c)
                } else
                    !function({element: t, onTextAnimationComplete: e, customBatchesRegex: i, frameTime: s=600}) {
                        let o, a = 0, r = null;
                        const l = new RegExp(i || ".","g")
                          , c = t?.textContent
                          , d = [...c.matchAll(l)].flatMap(t => t.length > 1 ? t.slice(1) : t[0]).filter(Boolean);
                        if (t.textContent = "",
                        !d.length)
                            return (0,
                            n.OP)(`No match found for string "${c}". Please review the regex or the text.`),
                            void e();
                        const h = i => {
                            try {
                                if (!t.isConnected)
                                    throw Error("Element doesn't exist");
                                r || (r = i),
                                i - r >= s && a < d.length && (t.textContent += d[a],
                                a++,
                                r = i),
                                a < d.length ? o = requestAnimationFrame(h) : (e(),
                                cancelAnimationFrame(o))
                            } catch (t) {
                                (0,
                                n.OP)("Error occurred during text animation:", t),
                                cancelAnimationFrame(o)
                            }
                        }
                        ;
                        o = requestAnimationFrame(h)
                    }({
                        element: h,
                        onTextAnimationComplete: () => {
                            const n = t[l + 1]?.parentElement.dataset[o]
                              , s = e.closest(`[data-parent-id="${n}"]`) || i;
                            a({
                                elements: t,
                                wrapper: s,
                                container: i,
                                ...r
                            }, l + 1).then(c)
                        }
                        ,
                        ...r
                    })
            }
            )
        }
    }
    ,
    48690: (t, e, i) => {
        function n(t) {
            return t instanceof HTMLElement ? [...t.querySelectorAll('link[rel="stylesheet"]')] : []
        }
        i.d(e, {
            D: () => n
        })
    }
    ,
    49375: (t, e, i) => {
        i.d(e, {
            W$: () => o,
            bF: () => l,
            nr: () => r,
            wO: () => a
        });
        var n = i(77801);
        let s;
        function o(t=window.location, e=(0,
        n.Ri)("wcmmode")) {
            return !function(t=window.location) {
                return "localhost" === t.hostname && "4901" === t.port
            }(t) && "edit" === e && !t.search?.includes("wcmmode=disabled")
        }
        function a() {
            return void 0 === s && (s = window.location.toString().includes("wcmmode=disabled")),
            s
        }
        function r() {
            return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
        }
        function l() {
            return window.self !== window.parent
        }
    }
    ,
    49477: (t, e, i) => {
        i.d(e, {
            T: () => o
        });
        var n = i(51967)
          , s = i(63264);
        class o {
            baseUrl = "";
            apiKey = "";
            userJourney = "";
            businessCategory = "";
            language = "en";
            organizationalUnit = "";
            token = "";
            documentCategories = [];
            uploadedDocuments = [];
            constructor(t, e, i, n, s, o, a={}) {
                this.baseUrl = t,
                this.apiKey = e,
                this.userJourney = i,
                this.businessCategory = n,
                this.language = s,
                this.organizationalUnit = o,
                this.options = a,
                this.options.documentCategories.length && (this.documentCategories = this.options.documentCategories)
            }
            async getDocumentCategories() {
                return this.documentCategories
            }
            async fetchDocumentCategories() {
                const t = await fetch(`${this.baseUrl}/categories?language=${this.language}&userJourney=${encodeURIComponent(this.userJourney)}&businessCategory=${encodeURIComponent(this.businessCategory)}`, {
                    method: "GET",
                    headers: {
                        apikey: this.apiKey,
                        Accept: "application/hal-forms+json"
                    }
                });
                if (!t.ok)
                    return [];
                const e = await t.json();
                this.documentCategories.push(...e._embedded.documentCategories)
            }
            async getDocumentTypeDetailsById(t) {
                return (await this.getDocumentCategories()).find(e => e.documentTypeId === t)
            }
            generateToken() {
                this.token = (0,
                s.l)()
            }
            async uploadFile(t, e) {
                this.token || this.generateToken();
                const i = await this.getDocumentTypeDetailsById(e)
                  , n = {
                    documentName: t.name,
                    remarks: "",
                    documentTypeId: i.documentTypeId,
                    documentTypeName: i.documentTypeName,
                    documentCategoryId: i.documentCategoryId,
                    documentCategoryName: i.documentCategoryName,
                    electronicDossier: i.electronicDossier,
                    userJourney: this.userJourney,
                    businessCategory: this.businessCategory
                }
                  , s = new Blob([JSON.stringify([n])],{
                    type: "application/json"
                })
                  , o = new FormData;
                o.append("files", t),
                o.append("documentMappings", s);
                const a = await this.uploadFileRequest(o);
                if (!a.ok)
                    return {
                        name: t.name,
                        success: !1
                    };
                const r = JSON.parse(a.headers.get("documentIds"))[0];
                return this.uploadedDocuments.push({
                    documentId: r,
                    documentMapping: n,
                    file: t
                }),
                {
                    success: !0,
                    name: t.name,
                    documentId: r,
                    documentMapping: n
                }
            }
            async uploadFileRequest(t) {
                if (window.nc.console?.enabled) {
                    const e = `test-${(0,
                    s.l)()}`
                      , i = new Headers;
                    return i.set("documentIds", JSON.stringify([e])),
                    (0,
                    n.aO)("Upload file to DUZ - body", {
                        body: t,
                        testId: e
                    }),
                    {
                        ok: !0,
                        headers: i
                    }
                }
                return fetch(`${this.baseUrl}/files`, {
                    method: "POST",
                    headers: {
                        apikey: this.apiKey,
                        token: this.token
                    },
                    body: t
                })
            }
            async deleteUploadedDocument(t) {
                if (!this.uploadedDocuments.filter(e => e.documentId === t))
                    return (0,
                    n.aO)(`Delete file not possible - ${t} not found in uploaded documents`),
                    {
                        success: !1
                    };
                const e = await this.deleteFileRequest(t);
                return this.uploadedDocuments = this.uploadedDocuments.filter(e => e.documentId !== t),
                {
                    success: e.ok
                }
            }
            async deleteFileRequest(t) {
                return window.nc.console?.enabled ? ((0,
                n.aO)("Delete file from DUZ - documentId", t),
                {
                    ok: !0
                }) : fetch(`${this.baseUrl}/${t}`, {
                    method: "DELETE",
                    headers: {
                        apikey: this.apiKey,
                        token: this.token
                    }
                })
            }
            async dispatchUpload(t) {
                if (!this.uploadedDocuments.length)
                    return {
                        success: !1,
                        reason: "Nothing to dispatch"
                    };
                const e = this.uploadedDocuments.map(e => ({
                    documentReferenceId: e.documentId,
                    documentExternalSystemComment: t
                }))
                  , i = {
                    userJourney: this.userJourney,
                    businessCategory: this.businessCategory,
                    organizationalUnit: this.organizationalUnit,
                    documentReferences: e
                };
                return (await this.dispatchRequest(i)).ok ? (this.generateToken(),
                this.uploadedDocuments = [],
                {
                    success: !0
                }) : {
                    success: !1
                }
            }
            async dispatchRequest(t) {
                return window.nc.console?.enabled ? ((0,
                n.aO)("Dispatch files on DUZ - jsonBody", t),
                {
                    ok: !0
                }) : fetch(`${this.baseUrl}/dispatch`, {
                    method: "POST",
                    headers: {
                        apikey: this.apiKey,
                        token: this.token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(t)
                })
            }
        }
    }
    ,
    50387: (t, e, i) => {
        i.d(e, {
            m: () => s
        });
        var n = i(33747);
        function s(t) {
            return (0,
            n.G)(t) ? JSON.parse(JSON.stringify(t)) : t
        }
    }
    ,
    51967: (t, e, i) => {
        function n(t, ...e) {
            window.nc.console?.enabled && console.error(t, ...e)
        }
        function s(t, ...e) {
            window.nc.console?.enabled && console.log(t, ...e)
        }
        function o(t, ...e) {
            window.nc.console?.enabled && console.warn(t, ...e)
        }
        function a(t, ...e) {
            window.nc.console?.enabled && console.debug(t, ...e)
        }
        i.d(e, {
            $Z: () => a,
            yA: () => n,
            aO: () => s,
            OP: () => o,
            fn: () => d
        });
        const r = new URL(window.location).searchParams.get("debug")
          , l = "false" === r
          , c = "true" === r;
        function d() {
            window.nc ??= {},
            window.nc.console ??= {
                enabled: !l && c,
                warn: o,
                error: n,
                log: s,
                debug: a
            }
        }
    }
    ,
    52462: (t, e, i) => {
        function n(t, e, i) {
            const n = encodeURIComponent(e)
              , s = `${n}=${encodeURIComponent(i)}`
              , o = new RegExp(`([?&])${n}=[^&#]*`)
              , a = t.indexOf("?")
              , r = t.substring(a)
              , l = r.match(o);
            let c;
            if (l) {
                const e = l[1];
                c = t.substring(0, a).concat(r.replace(l[0], `${e}${s}`))
            } else {
                let e = "";
                -1 === a ? e = "?" : a !== t.length - 1 && (e = "&"),
                c = t.concat(`${e}${s}`)
            }
            return c
        }
        i.d(e, {
            v: () => n
        })
    }
    ,
    52658: (t, e, i) => {
        i.d(e, {
            n: () => n
        });
        const n = (t, e) => {
            let i, n;
            return function(...s) {
                n = s,
                i || (i = setTimeout( () => {
                    e(n),
                    i = null
                }
                , t))
            }
        }
    }
    ,
    53022: (t, e, i) => {
        function n(t, e=" - ") {
            return t.map(t => t.adjacentInput ? `${t.dropdown}${e}${t.adjacentInput}` : t.dropdown)
        }
        i.d(e, {
            T: () => n
        })
    }
    ,
    53047: (t, e, i) => {
        i.d(e, {
            F: () => s
        });
        var n = i(88835);
        function s(t) {
            return (0,
            n.E)(t) && t > 0
        }
    }
    ,
    53211: (t, e, i) => {
        i.d(e, {
            s: () => s
        });
        var n = i(75729);
        class s {
            constructor(t, e) {
                this.el = t,
                this.instanceCallbacks = e,
                this.sessionCallbacks = void 0,
                this.running = !1,
                this.activeUiAnimations = [],
                this.browserAnimationFramesRequested = [],
                this.onBeforeFirstOptionalAnimationFrame = this.onBeforeFirstOptionalAnimationFrame.bind(this),
                this.afterFirstOptionalAnimationFrame = this.afterFirstOptionalAnimationFrame.bind(this),
                this.onUiAnimationStart = this.onUiAnimationStart.bind(this),
                this.onUiAnimationEnd = this.onUiAnimationEnd.bind(this)
            }
            anyActiveUiAnimation() {
                return this.activeUiAnimations.length > 0
            }
            run(t) {
                this.running && this.abort(),
                this.sessionCallbacks = t,
                this.running = !0,
                this.instanceCallbacks.animationTrigger?.(),
                this.sessionCallbacks?.animationTrigger?.(),
                this.runAfterNextBrowserAnimationFrame(this.onBeforeFirstOptionalAnimationFrame)
            }
            abort() {
                this.running && (this.cleanup(),
                this.instanceCallbacks.onAbort?.(),
                this.sessionCallbacks?.onAbort?.(),
                this.instanceCallbacks.onEnd?.(),
                this.sessionCallbacks?.onEnd?.())
            }
            runAfterNextBrowserAnimationFrame(t) {
                const e = requestAnimationFrame(t);
                this.browserAnimationFramesRequested.push(e)
            }
            onBeforeFirstOptionalAnimationFrame() {
                this.clearActiveUiAnimations(),
                this.attachUiAnimationDomHandlers(),
                this.instanceCallbacks.onBeforeOptionalAnimation?.(),
                this.sessionCallbacks?.onBeforeOptionalAnimation?.(),
                this.runAfterNextBrowserAnimationFrame(this.afterFirstOptionalAnimationFrame)
            }
            onUiAnimationStart(t) {
                this.activeUiAnimations.push(t)
            }
            onUiAnimationEnd(t) {
                if (this.anyActiveUiAnimation()) {
                    for (let e = this.activeUiAnimations.length - 1; e >= 0; e--) {
                        const i = this.activeUiAnimations[e];
                        this.eventsStartEndMatch(i, t) && this.activeUiAnimations.splice(e, 1)
                    }
                    this.anyActiveUiAnimation() || this.afterAllUiAnimationsEnd()
                }
            }
            afterFirstOptionalAnimationFrame() {
                this.anyActiveUiAnimation() || this.afterNoUiAnimationStarted()
            }
            afterNoUiAnimationStarted() {
                this.cleanup(),
                this.instanceCallbacks.onNoAnimation?.(),
                this.sessionCallbacks?.onNoAnimation?.(),
                this.instanceCallbacks.onEnd?.(),
                this.sessionCallbacks?.onEnd?.()
            }
            afterAllUiAnimationsEnd() {
                this.cleanup(),
                this.instanceCallbacks.onAnimationComplete?.(),
                this.sessionCallbacks?.onAnimationComplete?.(),
                this.instanceCallbacks.onEnd?.(),
                this.sessionCallbacks?.onEnd?.()
            }
            eventsStartEndMatch(t, e) {
                return t.target === e.target && (t.type.startsWith("animation") && e.type.startsWith("animation") || t.type.startsWith("transition") && e.type.startsWith("transition")) && t.propertyName === e.propertyName && t.animationName === e.animationName
            }
            attachUiAnimationDomHandlers() {
                n.s.start.forEach(t => {
                    this.el.addEventListener(t, this.onUiAnimationStart)
                }
                ),
                n.s.end.forEach(t => {
                    this.el.addEventListener(t, this.onUiAnimationEnd)
                }
                )
            }
            removeUiAnimationDomHandlers() {
                n.s.start.forEach(t => {
                    this.el.removeEventListener(t, this.onUiAnimationStart)
                }
                ),
                n.s.end.forEach(t => {
                    this.el.removeEventListener(t, this.onUiAnimationEnd)
                }
                )
            }
            clearActiveUiAnimations() {
                this.activeUiAnimations.length = 0
            }
            cancelBrowserAnimationFramesRequested() {
                this.browserAnimationFramesRequested.forEach(t => {
                    cancelAnimationFrame(t)
                }
                ),
                this.browserAnimationFramesRequested.length = 0
            }
            cleanup() {
                this.clearActiveUiAnimations(),
                this.cancelBrowserAnimationFramesRequested(),
                this.removeUiAnimationDomHandlers(),
                this.running = !1
            }
        }
    }
    ,
    53357: (t, e, i) => {
        function n(t, e=!0) {
            t.toggleAttribute("disabled", e),
            t.setAttribute("aria-disabled", String(e)),
            t.classList.toggle("actionbtn--disabled", e)
        }
        i.d(e, {
            v: () => n
        })
    }
    ,
    53364: (t, e, i) => {
        i.d(e, {
            Nz: () => $,
            Gd: () => n,
            Fr: () => F
        });
        var n = i(23224);
        class s {
            constructor() {
                this.cache = {}
            }
            addEntry(t, e) {
                this.cache[t] = e
            }
            getEntry(t) {
                return this.cache[t]
            }
            hasEntry(t) {
                return Object.keys(this.cache).includes(t)
            }
        }
        let o;
        function a() {
            return o || (o = new s),
            o
        }
        n.publishAndGetValue = (t, e, i, s) => new Promise(o => {
            let a;
            const r = () => {
                a && n.unsubscribe(e, a)
            }
            ;
            a = n.subscribe(e, (t, e) => {
                r(),
                o(e)
            }
            ),
            n.publish(t, s) || (r(),
            o(i))
        }
        ),
        n.publishCached = (t, e) => (a().addEntry(t, e),
        n.publish(t, e)),
        n.publishSyncCached = (t, e) => (a().addEntry(t, e),
        n.publishSync(t, e)),
        n.subscribeCached = (t, e) => {
            const i = n.subscribe(t, e);
            if (a().hasEntry(t)) {
                const e = a().getEntry(t);
                n.publish(t, e)
            }
            return i
        }
        ,
        n.getSubTopic = (t, e) => `${t}.${e}`,
        n.publishWithUUID = (t, e, i) => n.publish(`${t}.${e}`, i),
        n.subscribeWithUUID = (t, e, i) => n.subscribe(`${t}.${e}`, i);
        const r = "accordion"
          , l = "alertRibbon"
          , c = "chat"
          , d = "contextDisclaimer"
          , h = "dropdown"
          , u = "focusTrap"
          , p = "form"
          , m = "geolocationPermission"
          , g = "headerWrapper"
          , b = "keyFocus"
          , f = "map"
          , v = "navigationdrawer"
          , w = "overlaymanager"
          , S = "searchdrivenactivitystreamApi"
          , y = "searchdrivenactivitystreamFilters"
          , C = "searchdrivenactivitystreamPanel"
          , A = "servicePanel"
          , E = "showmoreButton"
          , k = "stickyHeader"
          , x = "vueFormController"
          , L = "pageheadarticleStickyheader"
          , I = "likeButton"
          , D = "fundFinder"
          , T = "propertyFinder"
          , $ = {
            accordion: {
                all: r,
                collapseAll: `${r}.collapseAll`
            },
            chat: {
                all: c,
                closeTermsOfUse: `${c}.closeTermsOfUse`
            },
            vueFormController: {
                all: x,
                submitInvalid: `${x}.submitInvalid`
            },
            form: {
                all: p,
                submitStart: `${p}.submitStart`,
                submitDone: `${p}.submitDone`,
                conditionalElementsChanged: `${p}.conditionalElementsChanged`
            },
            contextDisclaimer: {
                all: d,
                open: `${d}.open`,
                isOpened: `${d}.isOpened`,
                displayedOnLoad: `${d}.displayedOnLoad`
            },
            focusTrap: {
                all: u,
                deactivate: `${u}.deactivate`,
                update: `${u}.update`
            },
            SDASApi: {
                all: S,
                loadArticles: `${S}.loadArticles`
            },
            SDASFilters: {
                all: y,
                isFiltered: `${y}.isFiltered`,
                state: `${y}.state`
            },
            SDASPanel: {
                all: C,
                updateAccessibility: `${C}.updateAccessibility`
            },
            alertRibbon: {
                all: l,
                scrollOutOfView: `${l}.scrollOutOfView`,
                closed: `${l}.closed`
            },
            keyFocus: {
                all: b,
                addEventListeners: `${b}.addEventListeners`,
                removeOutline: `${b}.removeOutline`
            },
            dropdown: {
                all: h,
                addItems: `${h}.addItems`,
                change: `${h}.change`,
                toggleDisabled: `${h}.toggleDisabled`
            },
            servicePanel: {
                all: A,
                stateChange: `${A}.stateChange`
            },
            showmore: {
                all: E,
                update: `${E}.updateItems`
            },
            stickyHeader: {
                all: k,
                visibilityChange: `${k}.visibilityChange`,
                isStickyButtonVisible: `${k}.isStickyButtonVisible`
            },
            pageHeadArticleStickyHeader: {
                all: L,
                visibilityChange: `${L}.visibilityChange`
            },
            primaryheader: {
                wrapper: {
                    all: `${g}`,
                    positionChanged: `${g}.positionChanged`
                },
                overlaymanager: {
                    all: `${w}`,
                    toggleOverlay: `${w}.toggleOverlay`,
                    hidePreviousOverlay: `${w}.hidePreviousOverlay`,
                    updateOverlayContentById: `${w}.updateOverlayContentById`,
                    overlayOpened: `${w}.overlayOpened`,
                    overlayClosed: `${w}.overlayClosed`,
                    overlayTransitionEnd: `${w}.overlayTransitionEnd`,
                    sliderTransitionEnd: `${w}.sliderTransitionEnd`
                },
                navigationdrawer: {
                    all: `${v}`,
                    mainNavigationContentReady: `${v}.mainNavigationContentReady`,
                    metaNavigationContentReady: `${v}.metaNavigationContentReady`
                }
            },
            map: {
                all: f,
                updateMap: `${f}.updateMap`,
                onMapUpdated: `${f}.onMapUpdated`
            },
            geolocationPermission: {
                all: m,
                granted: `${m}.granted`
            },
            onlineAppointmentBooking: {
                branchSelected: "onlineAppointmentBooking.branchSelected"
            },
            likeButton: {
                all: I,
                stateChange: `${I}.stateChange`
            },
            fundFinder: {
                all: D,
                selectedFundType: `${D}.selectedFundType`
            },
            propertyFinder: {
                all: T,
                openTableClicked: `${T}.openTableClicked`
            }
        };
        function F() {
            window.nc ??= {},
            window.nc.PubSub ??= n,
            window.nc.PUBSUB_TOPICS ??= $
        }
    }
    ,
    53657: (t, e, i) => {
        function n(t={}, e={}) {
            const i = {
                ...t
            };
            return Object.keys(e).forEach(s => {
                e[s] && "object" == typeof e[s] && !Array.isArray(e[s]) ? i[s] = n(t[s], e[s]) : i[s] = void 0 !== e[s] ? e[s] : t[s]
            }
            ),
            i
        }
        i.d(e, {
            r: () => n
        })
    }
    ,
    53783: (t, e, i) => {
        i.d(e, {
            HG: () => b,
            yf: () => l,
            T9: () => f.T,
            qO: () => v,
            qj: () => p,
            Wp: () => d,
            vU: () => u,
            lT: () => g,
            Ao: () => m,
            iz: () => h,
            Z_: () => c
        });
        var n = i(84597)
          , s = i(23290);
        const o = "application_start"
          , a = "nn.launch.module.applicationtracking"
          , r = s.d.getInstance();
        function l(t, e=(0,
        n.b)(window.location.pathname)) {
            return `${o}-${t}-${e}`
        }
        function c(t, e=",") {
            const i = [];
            return Object.keys(t).forEach(e => {
                "" !== t[e] && i.push(`${e}:${t[e]}`)
            }
            ),
            i.join(e).replaceAll("true", "yes").replaceAll("false", "no")
        }
        function d(t) {
            r.call(`${a}.trackApplicationStarted`, t)
        }
        function h(t) {
            r.call(`${a}.trackStepView`, {
                attributes: t
            })
        }
        function u(t) {
            r.call(`${a}.trackCTAClicked`, {
                attributes: t
            })
        }
        function p(t) {
            r.call(`${a}.trackApplicationCompleted`, t)
        }
        function m(t) {
            r.call(`${a}.trackCustomEvent`, t)
        }
        function g(t) {
            r.call(`${a}.trackCalculatorInteraction`, t)
        }
        const b = 200;
        var f = i(80419);
        function v(t) {
            let e = "";
            return e = t.showChildrenCount ? `${t.label} ${t.currentChildNumber}/${t.totalChildrenNumber}` : t.label,
            e
        }
    }
    ,
    56474: (t, e, i) => {
        function n(t) {
            return /^\d+$/.test(t)
        }
        function s(t) {
            return a(t) && n(t) && function(t) {
                return t.length > 0 && "0" !== t[0]
            }(t)
        }
        i.d(e, {
            sm: () => n,
            yD: () => s,
            gc: () => a
        });
        var o = i(46430);
        function a(t) {
            return t.length === o.I5
        }
    }
    ,
    57563: (t, e, i) => {
        i.d(e, {
            H2: () => o,
            IO: () => n,
            NN: () => a,
            oB: () => r,
            wl: () => s
        });
        class n {
            constructor(t) {
                const e = [];
                for (let t = 0; t <= 1; t += .01)
                    e.push(t);
                this.callbacks = {},
                this.observer = new IntersectionObserver(this.execute.bind(this),{
                    threshold: e,
                    rootMargin: t
                })
            }
            execute(t) {
                t.forEach(t => {
                    if (t.isIntersecting) {
                        const {target: e} = t;
                        this.callbacks[e.uuid]?.(t)
                    }
                }
                )
            }
            observe(t, e, i) {
                this.callbacks[i] = e,
                this.observer.observe(t)
            }
            unobserve(t) {
                this.observer.unobserve(t),
                delete this.callbacks[t.uuid]
            }
        }
        const s = new n("20px")
          , o = new n("500px")
          , a = new n("20px")
          , r = new n("0px 0px -80% 0px")
    }
    ,
    58575: (t, e, i) => {
        i.d(e, {
            S: () => s
        });
        var n = i(51967);
        function s(t, e={}, i=!1) {
            if (!t)
                return "";
            let s;
            try {
                s = new URL(t),
                Object.entries(e).forEach( ([t,e]) => {
                    null == e || !i && s.searchParams.has(t) || s.searchParams.set(t, e)
                }
                )
            } catch (e) {
                return (0,
                n.OP)("Invalid URL format:", t, e),
                t
            }
            return s.toString()
        }
    }
    ,
    59034: (t, e, i) => {
        i.d(e, {
            b: () => p
        });
        var n = i(12458)
          , s = i(38349)
          , o = i(75511);
        const a = {
            tabHead: "tabhead__base",
            tabHeadLayoutAccordion: "tabhead__base--accordion",
            tabHeadLayoutTab: "tabhead__base--tab",
            tabHeadActive: "tabhead__base--active",
            tabHeadLink: "tabhead__link",
            arrowContainer: "tabhead__arrowContainer"
        }
          , r = {
            sideTabsWrapper: "__sideTabsWrapper",
            tab: "__tab",
            tabActive: "__tab--active",
            tabContentWrapper: "__tabContentWrapper"
        }
          , l = "data-tab-content-id"
          , c = "accordion"
          , d = "tab";
        var h = i(94497);
        async function u(t, e, i, n=!0) {
            const {tab: o, tabHeads: r, tabHeadLinks: l, accordionArrowContainer: d, accordionAnimationHandler: h} = t
              , u = n && i === c;
            e ? (o.classList.add(a.tabActive),
            r.accordionLayout.classList.add(a.tabHeadActive, s.N.svgIconActive),
            r.tabLayout.classList.add(a.tabHeadActive),
            d?.classList.add(s.N.svgIconActive),
            u ? await h.show() : h.showImmediately()) : (o.classList.remove(a.tabActive),
            r.accordionLayout.classList.remove(a.tabHeadActive, s.N.svgIconActive),
            r.tabLayout.classList.remove(a.tabHeadActive),
            d?.classList.remove(s.N.svgIconActive),
            u ? await h.hide() : h.hideImmediately()),
            t.opened = e,
            function(t, e) {
                t.setAttribute("aria-expanded", e ? "true" : "false")
            }(l.accordionLayout, e),
            function(t, e) {
                t.setAttribute("tabindex", e ? "0" : "-1")
            }(l.tabLayout, e)
        }
        class p {
            constructor(t, e) {
                this.el = t,
                this.options = e?.options || {},
                Object.entries(r).forEach( ([t,e]) => {
                    a[t] = `${this.options.componentClass}${e}`
                }
                ),
                this.onTabHeadClick = this.onTabHeadClick.bind(this),
                this.onGridContextChange = this.onGridContextChange.bind(this),
                this.onSideTabsWrapperKeyDown = this.onSideTabsWrapperKeyDown.bind(this),
                this.onHashChanged = this.onHashChanged.bind(this),
                this.init()
            }
            init() {
                this.tabsMap = {},
                this.currentGridContext = this.getCurrentGridContext(),
                this.currentLayout = this.getCurrentLayout(),
                this.setElements(),
                this.addEventListeners(),
                this.setInitialActiveTab(),
                this.onGridContextChange()
            }
            setElements() {
                this.sideTabsWrapper = this.el.querySelector(`.${a.sideTabsWrapper}`),
                this.el.querySelectorAll(`.${a.tab}:not(.${s.N.isHidden})`).forEach( (t, e) => {
                    const i = t.querySelector(`.${a.tabContentWrapper}`)
                      , n = i?.getAttribute("id");
                    if (n) {
                        const s = `[${l}="${n}"]`
                          , r = {
                            accordionLayout: this.el.querySelector(`.${a.tabHeadLayoutAccordion}${s}`),
                            tabLayout: this.el.querySelector(`.${a.tabHeadLayoutTab}${s}`)
                        }
                          , d = {
                            accordionLayout: r.accordionLayout.querySelector(`.${a.tabHeadLink}`),
                            tabLayout: r.tabLayout.querySelector(`.${a.tabHeadLink}`)
                        }
                          , h = new o.c(i,{
                            expandedOnInit: e === this.options.defaultSection && this.currentLayout === c
                        });
                        if (this.tabsMap[n] = {
                            id: n,
                            tab: t,
                            tabContentWrapper: i,
                            tabHeads: r,
                            tabHeadLinks: d,
                            accordionAnimationHandler: h
                        },
                        this.options.hasSvgIconsInAccordion) {
                            const t = d.accordionLayout.querySelector(`.${a.arrowContainer}`);
                            this.tabsMap[n].accordionArrowContainer = t
                        }
                    }
                }
                )
            }
            addEventListeners() {
                this.el.addEventListener("nnGridContextChanged", this.onGridContextChange),
                this.el.addEventListener("keydown", this.onSideTabsWrapperKeyDown),
                Object.values(this.tabsMap).forEach(t => {
                    Object.values(t.tabHeadLinks).forEach(t => {
                        t.addEventListener("click", this.onTabHeadClick)
                    }
                    )
                }
                ),
                window.addEventListener("hashchange", this.onHashChanged, !1)
            }
            setInitialActiveTab() {
                const t = window.location.hash
                  , e = Object.values(this.tabsMap);
                let i = e[this.options.defaultSection]
                  , n = null
                  , s = !1;
                if (t) {
                    const e = t.substring(1);
                    n = this.tabsMap[e] || null,
                    s = !!n
                }
                if (!n) {
                    const t = nn.webstorage.getStorage(this.options.cookieName);
                    "false" === t ? i = null : t && (n = this.tabsMap[t] || null)
                }
                n || (n = i),
                e.forEach( (t, e) => {
                    n && n.id === t.id ? (this.setActiveTab(n, {
                        isAnimationEnabled: !0
                    }),
                    s && this.scrollToTab(n)) : this.currentLayout === c && e === this.options.defaultSection ? u(t, !1, this.currentLayout) : u(t, !1, this.currentLayout, !1)
                }
                )
            }
            scrollToTab(t) {
                const {pageYOffset: e} = window
                  , {top: i} = t.tab.getBoundingClientRect();
                window.scroll(window.pageXOffset, e + i - 100)
            }
            onTabHeadClick(t) {
                const e = t.target.closest(`.${a.tabHead}`)
                  , i = e?.getAttribute(l);
                if (i) {
                    const t = this.tabsMap[i];
                    this.setActiveTab(t, {
                        isAnimationEnabled: !0,
                        scrollTabIntoView: !0
                    }),
                    nn.webstorage.setStorage(this.options.cookieName, this.activeTab ? this.activeTab.id : "false")
                }
            }
            getCurrentGridContext() {
                return this.el.getAttribute(n.W.gridContextAttribute)
            }
            getCurrentLayout() {
                return this.options.tabContexts.includes(this.currentGridContext) ? d : c
            }
            onGridContextChange() {
                const t = Object.values(this.tabsMap);
                this.currentGridContext = this.getCurrentGridContext(),
                this.currentLayout = this.getCurrentLayout(),
                t.forEach(t => {
                    var e;
                    e = t.tabContentWrapper,
                    this.currentLayout === c ? (e.setAttribute("role", "region"),
                    e.setAttribute("tabindex", "-1")) : (e.setAttribute("role", "tabpanel"),
                    e.setAttribute("tabindex", "0"))
                }
                ),
                this.currentLayout === d && (this.lastOpenedTab || (this.lastOpenedTab = t[this.options.defaultSection] || t[0]),
                this.setActiveTab(this.lastOpenedTab, {
                    isAnimationEnabled: !0,
                    scrollTabIntoView: !0
                }),
                t.forEach(t => {
                    u(t, t.id === this.lastOpenedTab?.id, this.currentLayout, !0)
                }
                ))
            }
            async setActiveTab(t, e={}) {
                const {activeTab: i} = this
                  , {isAnimationEnabled: n=!1} = e;
                if (this.currentLayout === d) {
                    if (i) {
                        if (i.id === t.id)
                            return;
                        u(i, !1, this.currentLayout, n),
                        this.activeTab = null
                    }
                } else if (this.currentLayout === c && t.opened)
                    return u(t, !1, this.currentLayout, n),
                    void (this.activeTab = null);
                i && i.id === t.id || (u(t, !0, this.currentLayout, n),
                t.opened = !0,
                this.activeTab = t,
                this.lastOpenedTab = t)
            }
            onSideTabsWrapperKeyDown(t) {
                const e = function(t, e, i) {
                    if (!i)
                        return null;
                    const n = Object.keys(e);
                    let s = n.indexOf(i.id);
                    switch (t.key) {
                    case "ArrowUp":
                    case "Up":
                    case "ArrowLeft":
                    case "Left":
                        s--;
                        break;
                    case "ArrowDown":
                    case "Down":
                    case "ArrowRight":
                    case "Right":
                        s++;
                        break;
                    default:
                        return null
                    }
                    return s = (0,
                    h.N)(s, 0, n.length - 1),
                    e[n[s]]
                }(t, this.tabsMap, this.activeTab);
                e && (t.preventDefault(),
                this.setActiveTab(e, {
                    isAnimationEnabled: !0
                }),
                e.tabHeadLinks.tabLayout.focus())
            }
            onHashChanged() {
                const t = window.location.hash.replace("#", "");
                if (!t)
                    return;
                const e = Object.values(this.tabsMap).find(e => e.id === t && this.activeTab !== e);
                e && this.setActiveTab(e, {
                    scrollTabIntoView: !0
                })
            }
        }
    }
    ,
    61703: (t, e, i) => {
        function n(t) {
            return "boolean" == typeof t
        }
        i.d(e, {
            L: () => n
        })
    }
    ,
    63264: (t, e, i) => {
        function n() {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, t => {
                const e = Math.floor(16 * Math.random());
                return ("x" === t ? e : Math.floor(e % 3 + 8)).toString(16)
            }
            )
        }
        i.d(e, {
            l: () => n
        })
    }
    ,
    66432: (t, e, i) => {
        i.d(e, {
            G7: () => r,
            Nv: () => s,
            Qq: () => c,
            Uj: () => d,
            ZM: () => o,
            iw: () => a,
            tT: () => l
        });
        const n = "slider"
          , s = {
            actionHidden: `${n}__action--hidden`,
            baseActive: `${n}__base--active`,
            gradientHidden: `${n}__gradient--hidden`,
            indicatorActive: `${n}__indicator--active`,
            next: `${n}__action--next`,
            numbersHidden: `${n}__numbers--hidden-desktop`,
            pause: `${n}__action--pause`,
            slideActive: `${n}__item--active`
        }
          , o = {
            base: `.${n}__base`,
            container: `.${n}__container`,
            gradientLeft: `.${n}__gradient--left`,
            gradientRight: `.${n}__gradient--right`,
            indicator: `.${n}__indicator`,
            indicatorActiveSlideNumber: `.${n}__activeItem`,
            indicatorButton: `.${n}__indicatorButton`,
            indicatorIcon: `.${n}__indicatorIcon`,
            indicatorTotalCountNumber: `.${n}__totalItem`,
            indicatorsWrapper: `.${n}__indicatorsWrapper`,
            next: `.${n}__action--next`,
            numbersWrapper: `.${n}__numbers`,
            pause: `.${n}__action--pause`,
            previous: `.${n}__action--previous`,
            reset: `.${n}__action--reset`,
            screenReaderInfo: `.${n}__screenReaderInfo`,
            screenReaderInfoCount: `.${n}__screenReaderInfoCount`,
            slide: `.${n}__item`,
            start: `.${n}__action--start`
        }
          , a = {
            focusOutlineExclude: "data-nn-outlineexclude",
            indicatorIndex: `data-${n}-indicator-index`,
            itemIndex: `data-${n}-item-index`
        }
          , r = {
            container: {
                role: "",
                ariaLabel: "",
                ariaRoleDescription: "",
                ariaLive: ""
            },
            screenReaderInfo: {
                ariaLive: ""
            }
        }
          , l = {
            initialSlideIndex: 0
        }
          , c = {
            forward: "forward",
            backward: "backward",
            none: "none"
        }
          , d = {
            autoplayNext: "autoplayNext",
            nextArrow: "nextArrow",
            none: "none",
            otherIcon: "otherIcon",
            previousArrow: "previousArrow"
        }
    }
    ,
    67474: (t, e, i) => {
        i.d(e, {
            F: () => a,
            s: () => r
        });
        var n = i(35327)
          , s = i(21030)
          , o = i(53364);
        function a(t, e) {
            const i = e ? n.ul.tabbingDisabledElements : n.ul.tabbingEnabledElements;
            t.querySelectorAll(i).forEach(t => {
                t.classList.contains(n.aw.noFocus) || t.setAttribute("tabindex", e ? "0" : "-1")
            }
            )
        }
        function r(t, e=null, i=!0) {
            const a = () => Array.from(t.querySelectorAll(n.ul.tabbingEnabledElements))
              , r = document.activeElement;
            let l, c, d, h = a(), u = 1;
            h.length || (h = [t]);
            const p = function(t) {
                return t.find(t => "visible" === window.getComputedStyle(t).visibility)
            }
              , m = t => {
                t.key === s.f.tab && (u = t.shiftKey ? -1 : 1,
                d || (d = window.scrollY)),
                t.key === s.f.esc && e?.()
            }
              , g = e => {
                if (!t.contains(e.target)) {
                    const t = 1 === u ? h : [...h].reverse()
                      , e = p(t);
                    e?.focus(),
                    d && window.scrollTo(0, d)
                }
            }
            ;
            if (i) {
                const t = p(h);
                t?.focus()
            }
            t.addEventListener("keydown", m),
            document.addEventListener("focusin", g),
            l = o.Gd.subscribe(o.Nz.focusTrap.deactivate, (e, i=r) => {
                i?.focus(),
                t.removeEventListener("keydown", m),
                document.removeEventListener("focusin", g),
                o.Gd.unsubscribe(l),
                o.Gd.unsubscribe(c)
            }
            ),
            c = o.Gd.subscribe(o.Nz.focusTrap.update, () => {
                h = a()
            }
            )
        }
    }
    ,
    68049: (t, e, i) => {
        i.d(e, {
            m: () => r
        });
        var n = i(35327)
          , s = i(21030)
          , o = i(94497)
          , a = i(75511);
        class r {
            constructor(t, e, i, n) {
                const {el: s, dropdown: o, dropdownButton: r, dropdownButtonText: l, dropdownLinks: c} = t;
                this.mainElement = s,
                this.dropdown = o,
                this.dropdownButton = r,
                this.dropdownButtonText = l,
                this.dropdownLinks = c,
                this.classes = e,
                this.callbacks = i,
                this.options = n,
                this.dropdownAnimation = new a.c(this.dropdown),
                this.isDropdownOpen = !1,
                this.buttonIsFocused = !1,
                this.focusedDropdownLinkIndex = -1,
                this.currentlySelectedItem = null,
                this.onDropdownButtonClicked = this.onDropdownButtonClicked.bind(this),
                this.onDropdownButtonKeyDown = this.onDropdownButtonKeyDown.bind(this),
                this.onDropdownFocused = this.onDropdownFocused.bind(this),
                this.onDropdownKeyDown = this.onDropdownKeyDown.bind(this),
                this.onDropdownTransitionEnd = this.onDropdownTransitionEnd.bind(this),
                this.onElementFocusout = this.onElementFocusout.bind(this),
                this.onDocumentClicked = this.onDocumentClicked.bind(this),
                this.init()
            }
            init() {
                this.addDropdownEventListeners(),
                this.isDropdownOpen && this.setDropdownOpenedStatus(!1),
                this.options?.preSelectedOption && this.onDropdownItemSelection({
                    target: this.options?.preSelectedOption
                })
            }
            setDropdownLinks(t) {
                this.dropdownLinks = t
            }
            addDropdownEventListeners() {
                this.dropdownButton.addEventListener("click", this.onDropdownButtonClicked),
                this.dropdownButton.addEventListener("keydown", this.onDropdownButtonKeyDown),
                this.dropdown.addEventListener("focusin", this.onDropdownFocused),
                this.dropdown.addEventListener("keydown", this.onDropdownKeyDown),
                this.dropdown.addEventListener("transitionend", this.onDropdownTransitionEnd),
                this.mainElement.addEventListener("focusout", this.onElementFocusout),
                this.classes.dropdownItem && (this.classes.dropdownItemSelected = `${this.classes.dropdownItem}--selected`,
                this.dropdown.addEventListener("click", this.onDropdownClick.bind(this))),
                window.nc.loaderRun(this.dropdown),
                window.nc.loaderObserve(this.dropdown)
            }
            setDropdownOpenedStatus(t) {
                t ? (this.dropdownButton.parentElement.classList.add(this.classes.dropdownButtonActive),
                this.dropdownButton.setAttribute("aria-expanded", "true"),
                this.dropdownAnimation.show(),
                document.addEventListener("click", this.onDocumentClicked)) : (this.dropdownButton.parentElement.classList.remove(this.classes.dropdownButtonActive),
                this.dropdownButton.setAttribute("aria-expanded", "false"),
                this.focusedDropdownLinkIndex = -1,
                this.dropdownAnimation.hide(),
                document.removeEventListener("click", this.onDocumentClicked)),
                this.isDropdownOpen = t,
                this.callbacks?.onSetDropdownOpenStatus?.(t)
            }
            onDropdownButtonClicked() {
                this.setDropdownOpenedStatus(!this.isDropdownOpen),
                this.buttonIsFocused = document.activeElement === this.dropdownButton
            }
            focusDropdownElement(t) {
                const e = this.dropdownLinks[this.focusedDropdownLinkIndex]
                  , i = this.dropdownLinks[t];
                e !== i && (i ? i.focus() : -1 === t && this.dropdownButton.focus(),
                this.focusedDropdownLinkIndex = t)
            }
            onDropdownFocused(t) {
                this.focusedDropdownLinkIndex = Array.prototype.indexOf.call(this.dropdownLinks, t.target)
            }
            onElementFocusout(t) {
                const e = t.relatedTarget;
                e && this.buttonIsFocused && !this.mainElement.contains(e) && (this.setDropdownOpenedStatus(!1),
                this.buttonIsFocused = !1)
            }
            onDropdownButtonKeyDown(t) {
                if (t.target === t.currentTarget)
                    switch (t.key) {
                    case s.f.enter:
                        this.buttonIsFocused = document.activeElement === this.dropdownButton;
                        break;
                    case s.f.down:
                        this.isDropdownOpen && (this.focusDropdownElement(0),
                        t.preventDefault());
                        break;
                    case s.f.esc:
                        this.isDropdownOpen && (this.setDropdownOpenedStatus(!1),
                        t.preventDefault())
                    }
            }
            onDropdownKeyDown(t) {
                let e = this.focusedDropdownLinkIndex
                  , i = !1;
                switch (t.key) {
                case s.f.up:
                    e--,
                    t.preventDefault();
                    break;
                case s.f.down:
                    e++,
                    t.preventDefault();
                    break;
                case s.f.esc:
                    e = -1,
                    i = !0,
                    t.preventDefault()
                }
                e = (0,
                o.N)(e, -1, this.dropdownLinks.length - 1),
                e !== this.focusedDropdownLinkIndex && this.focusDropdownElement(e),
                i && this.setDropdownOpenedStatus(!1)
            }
            onDocumentClicked(t) {
                const {target: e} = t;
                e === this.dropdownButton || this.dropdown.contains(e) || this.dropdownButton.contains(e) || this.setDropdownOpenedStatus(!1)
            }
            onDropdownTransitionEnd({propertyName: t}) {
                "height" === t && this.callbacks?.onDropdownTransitionEnd?.(this.isDropdownOpen)
            }
            onDropdownClick({target: t}) {
                this.onDropdownItemSelection({
                    target: t
                })
            }
            onDropdownItemSelection({target: t}) {
                const e = t.closest(`.${this.classes.dropdownItem}`);
                e && (this.currentlySelectedItem?.classList.remove(this.classes.dropdownItemSelected),
                this.currentlySelectedItem?.setAttribute(n.vj.ariaSelected, "false"),
                e.classList.add(this.classes.dropdownItemSelected),
                e.setAttribute(n.vj.ariaSelected, "true"),
                this.currentlySelectedItem = e,
                this.options?.displaySelectedValue && ((this.dropdownButtonText || this.dropdownButton).innerText = e.innerText),
                this.setDropdownOpenedStatus(!1))
            }
        }
    }
    ,
    68084: (t, e, i) => {
        function n(t) {
            return "GB" === t ? "UK" : t
        }
        i.d(e, {
            N: () => n
        })
    }
    ,
    69550: (t, e, i) => {
        function n(t) {
            return window.requestIdleCallback ? window.requestIdleCallback(t, {
                timeout: 2e3
            }) : function(t, e=1) {
                const i = e
                  , n = performance.now();
                return setTimeout( () => {
                    t({
                        get didTimeout() {
                            return performance.now() - n - e > i
                        },
                        timeRemaining: () => Math.max(0, e + (performance.now() - n))
                    })
                }
                , e)
            }(t)
        }
        i.d(e, {
            O: () => n
        })
    }
    ,
    70306: (t, e, i) => {
        i.d(e, {
            Z: () => n
        });
        const n = {
            ubsIframeSize: "ubs.iframe.size"
        }
    }
    ,
    70559: (t, e, i) => {
        i.d(e, {
            LI: () => o,
            MS: () => r
        }),
        i(22459);
        const n = {
            success: "form__msg-is-success",
            error: "form__msg-is-error"
        }
          , s = {
            title: ".form__msgHl",
            text: ".form__msgTxt",
            content: ".form__msgContent"
        };
        function o(t, e) {
            const i = t.querySelector(s.title)
              , o = t.querySelector(s.text)
              , a = t.querySelector(s.content);
            a && (a.classList.toggle(n.success, e.success),
            a.classList.toggle(n.error, !e.success)),
            i && e.title && (i.textContent = e.title),
            o && e.text && (o.textContent = e.text)
        }
        var a = i(92478);
        function r(t, e) {
            e && o(t, e),
            (0,
            a.kl)(t)
        }
    }
    ,
    71129: (t, e, i) => {
        i.d(e, {
            j: () => o
        });
        const n = {
            apple: /iphone|ipad|ipod/i,
            android: /android/i,
            huawei: /huawei/i
        }
          , s = {
            apple: "apple",
            android: "android",
            huawei: "huawei",
            desktop: null
        };
        function o(t) {
            return n.apple.test(t) ? s.apple : n.android.test(t) ? n.huawei.test(t) ? s.huawei : s.android : s.desktop
        }
    }
    ,
    71350: (t, e, i) => {
        function n(t) {
            return "fulfilled" === t.status
        }
        i.d(e, {
            r: () => n
        })
    }
    ,
    72022: (t, e, i) => {
        i.d(e, {
            p: () => s
        });
        const n = ["h3", "ol", "ul", "li", "p", "strong", "em", "a"];
        function s(t, e=n) {
            const i = new Set(e)
              , s = t.querySelectorAll("*");
            for (let t = s.length - 1; t >= 0; t--) {
                const e = s[t];
                if (!i.has(e.tagName.toLowerCase())) {
                    const t = e.parentNode;
                    for (; e.firstChild; )
                        t.insertBefore(e.firstChild, e);
                    t.removeChild(e)
                }
            }
        }
    }
    ,
    72502: (t, e, i) => {
        i.d(e, {
            W: () => s
        });
        var n = i(7186);
        function s(t, e) {
            if (!Array.isArray(t) || !Array.isArray(e))
                throw new TypeError("Inputs must be arrays.");
            const i = t.length;
            if (0 === i)
                throw new Error("Arrays cannot be empty.");
            if (i !== e.length)
                throw new Error("Input arrays must have the same length.");
            if (!t.every(t => "number" == typeof t) || !e.every(t => "number" == typeof t))
                throw new TypeError("All array elements must be numbers.");
            const s = (0,
            n.G)(t)
              , o = (0,
            n.G)(e);
            return t.reduce( (t, i, n) => t + (i - s) * (e[n] - o), 0) / i
        }
    }
    ,
    72809: (t, e, i) => {
        function n(t) {
            let e = t;
            return function(t) {
                return t % 1 != 0
            }(t) && (e = (Math.round(100 * t) / 100).toFixed(2)),
            Number(e)
        }
        i.d(e, {
            Q: () => n
        })
    }
    ,
    73247: (t, e, i) => {
        function n(t, e) {
            const i = [];
            return e.forEach(e => {
                e && !i.includes(e) && !t.includes(`.${e}.`) && i.push(e)
            }
            ),
            i.length ? t.replace(/\.html/, `.${i.join(".")}$&`) : t
        }
        i.d(e, {
            C: () => n
        })
    }
    ,
    74137: (t, e, i) => {
        function n(t) {
            return t.replace(/%20/g, " ").replace("#", "").trim()
        }
        function s(t, e, {mainHeaderHeight: i, navigationHeight: s=0}) {
            t.preventDefault();
            const {target: o} = t;
            if (!o)
                return;
            const a = o.closest("a");
            if (a) {
                const t = a.getAttribute("href")
                  , o = n(t).replace("#", "")
                  , c = document.getElementById(o);
                if (r(a, e),
                c) {
                    let e = 0;
                    const {scrollTop: n} = document.documentElement
                      , {top: o} = c.getBoundingClientRect();
                    setTimeout( () => {
                        (i || s) && (e = o < 0 ? i + s : s),
                        c.focus(),
                        window.scrollTo({
                            top: Math.abs(n + o - e),
                            behavior: "smooth"
                        }),
                        l(t)
                    }
                    )
                }
                return {
                    linkElement: a,
                    targetElement: c
                }
            }
        }
        i.d(e, {
            Pe: () => n,
            cm: () => s,
            cx: () => r,
            It: () => l
        });
        var o = i(53783);
        const a = {
            anchorlinks: "Anchor link",
            stickyinpagenavigation: "In-page Sticky Navigation"
        };
        function r(t, e) {
            const i = t.dataset.anchorTracking;
            if (!i)
                return;
            const n = a[`${e}`];
            (0,
            o.vU)({
                applicationEventName: "Anchor link clicked",
                applicationName: n,
                applicationCTAName: i,
                applicationCTAURL: "#"
            })
        }
        function l(t) {
            const {origin: e, pathname: i, search: n} = window.location
              , s = e + i + n + t;
            history.pushState({}, "", s),
            window.dispatchEvent(new Event("hashchange"))
        }
    }
    ,
    74351: (t, e, i) => {
        function n(t=10) {
            if (t > 10)
                throw new Error(`Max allowed ID length is 10, but a length of ${t} was requested`);
            return `id-${Math.random().toString(36).substring(2, 2 + t)}`
        }
        i.d(e, {
            J: () => n
        })
    }
    ,
    75189: (t, e, i) => {
        function n(t, e, i=100) {
            let n;
            const s = () => {
                clearTimeout(n),
                n = setTimeout( () => {
                    e(),
                    t.removeEventListener("scroll", s)
                }
                , i)
            }
            ;
            t.addEventListener("scroll", s),
            s()
        }
        i.d(e, {
            w: () => n
        })
    }
    ,
    75511: (t, e, i) => {
        i.d(e, {
            c: () => s
        });
        var n = i(75729);
        class s {
            constructor(t, e) {
                this.element = t,
                this.options = {
                    baseClass: n.i.base,
                    transitionClass: n.i.transition,
                    expandedClass: n.i.expanded,
                    collapsedClass: n.i.collapsed,
                    expandedOnInit: !1,
                    ...e
                },
                this.onTransitionEnd = this.onTransitionEnd.bind(this),
                this.init()
            }
            init() {
                this.element.classList.add(this.options.baseClass),
                this.element.classList.add(this.options.expandedOnInit ? this.options.expandedClass : this.options.collapsedClass),
                this.element.classList.add(this.options.transitionClass),
                this.element.addEventListener("transitionend", this.onTransitionEnd)
            }
            show() {
                return new Promise(t => {
                    this.afterComputedStylesUpdate( () => {
                        const e = this.getCurrentElementHeight()
                          , i = this.getExpandedElementHeight()
                          , n = () => {
                            this.element.classList.add(this.options.expandedClass),
                            this.element.style.height = "",
                            t()
                        }
                        ;
                        e === i ? n() : (this.transitionEndCallback = n,
                        this.element.classList.remove(this.options.expandedClass),
                        this.element.classList.remove(this.options.collapsedClass),
                        this.element.style.height = `${e}px`,
                        requestAnimationFrame( () => {
                            this.element.style.height = `${i}px`
                        }
                        ))
                    }
                    )
                }
                )
            }
            showImmediately() {
                this.element.classList.remove(this.options.collapsedClass),
                this.element.classList.remove(this.options.transitionClass),
                this.element.classList.add(this.options.expandedClass),
                this.element.style.height = "",
                this.element.classList.add(this.options.transitionClass)
            }
            hide() {
                return new Promise(t => {
                    this.afterComputedStylesUpdate( () => {
                        const e = this.getCurrentElementHeight()
                          , i = () => {
                            this.element.classList.remove(this.options.expandedClass),
                            this.element.classList.add(this.options.collapsedClass),
                            this.element.style.height = "",
                            t()
                        }
                        ;
                        0 === e ? i() : (this.transitionEndCallback = i,
                        this.element.classList.remove(this.options.expandedClass),
                        this.element.classList.remove(this.options.collapsedClass),
                        this.element.style.height = `${e}px`,
                        requestAnimationFrame( () => {
                            this.element.style.height = 0
                        }
                        ))
                    }
                    )
                }
                )
            }
            hideImmediately() {
                this.element.classList.remove(this.options.transitionClass),
                this.element.classList.remove(this.options.expandedClass),
                this.element.classList.add(this.options.collapsedClass),
                this.element.style.height = "",
                this.element.classList.add(this.options.transitionClass)
            }
            isHidden() {
                return !this.element.classList.contains(this.options.expandedClass)
            }
            animateContentChange(t) {
                const e = this.getCurrentElementHeight()
                  , i = () => {
                    this.element.classList.add(this.options.expandedClass),
                    this.element.style.height = ""
                }
                ;
                t();
                const n = this.getExpandedElementHeight();
                e === n ? i() : (this.transitionEndCallback = i,
                this.element.classList.remove(this.options.expandedClass),
                this.element.classList.remove(this.options.collapsedClass),
                this.element.style.height = `${e}px`,
                requestAnimationFrame( () => {
                    this.element.style.height = `${n}px`
                }
                ))
            }
            getCurrentElementHeight() {
                return this.element.offsetHeight
            }
            getExpandedElementHeight() {
                const t = this.element.style.height
                  , e = this.element.classList.contains(this.options.expandedClass)
                  , i = this.element.classList.contains(this.options.collapsedClass);
                this.element.classList.remove(this.options.collapsedClass),
                this.element.classList.add(this.options.expandedClass),
                this.element.style.height = "";
                const n = this.getCurrentElementHeight();
                return this.element.style.height = t,
                i && this.element.classList.add(this.options.collapsedClass),
                e || this.element.classList.remove(this.options.expandedClass),
                n
            }
            onTransitionEnd(t) {
                t.target === this.element && (this.transitionEndCallback && (this.transitionEndCallback(),
                this.transitionEndCallback = null),
                this.options.transitionEndCallback?.(!this.isHidden()))
            }
            afterComputedStylesUpdate(t) {
                requestAnimationFrame(t)
            }
        }
    }
    ,
    75729: (t, e, i) => {
        i.d(e, {
            i: () => n,
            s: () => s
        });
        const n = {
            base: "verticalshrink__base",
            transition: "verticalshrink__base--transition",
            expanded: "verticalshrink__base--expanded",
            collapsed: "verticalshrink__base--collapsed"
        }
          , s = {
            start: ["animationstart", "transitionrun"],
            end: ["animationend", "animationcancel", "transitionend", "transitioncancel"]
        }
    }
    ,
    76633: (t, e, i) => {
        i.d(e, {
            V: () => s
        });
        var n = i(20495);
        function s(t) {
            return (0,
            n.c)(t) && 0 === t.length
        }
    }
    ,
    77639: (t, e, i) => {
        i.d(e, {
            q: () => n
        });
        const n = {
            switzerland: "CH",
            germany: "DE",
            austria: "AT",
            uk: "UK",
            italy: "IT",
            france: "FR",
            spain: "ES",
            portugal: "PT",
            greece: "GR",
            other: "OTHER",
            sweden: "SE",
            us: "US"
        }
    }
    ,
    77801: (t, e, i) => {
        i.d(e, {
            Ej: () => c,
            JT: () => r,
            Ri: () => o,
            TV: () => a,
            Vm: () => l
        });
        var n = i(51967)
          , s = i(13655);
        function o(t) {
            const e = document.cookie.match(new RegExp(`(?:^|; )${t.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`));
            return e ? decodeURIComponent(e[1]) : ""
        }
        function a(t, e, i={}) {
            const o = {
                path: "/",
                samesite: "lax",
                ...i,
                secure: !0
            };
            o.expires instanceof Date ? o.expires = o.expires.toUTCString() : o.expires && (0,
            n.yA)("Option expires cookie is not a Date ", t, o.expires),
            o.domain || "localhost" === document.location.hostname || (o.domain = (0,
            s.X)());
            let a = `${encodeURIComponent(t)}=${encodeURIComponent(e)}`;
            Object.keys(o).forEach(t => {
                a += `; ${t}`;
                const e = o[t];
                !0 !== e && (a += `=${e}`)
            }
            ),
            document.cookie = a
        }
        function r(t="") {
            const e = {};
            return t.split(";").forEach(t => {
                const i = t.split("=")
                  , n = i.shift().trim()
                  , s = decodeURIComponent(i.join("="));
                e[n] = s
            }
            ),
            e
        }
        function l(t, e) {
            document.cookie = `${t}=; Path=/; Domain=${e}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`
        }
        function c(t) {
            const e = new RegExp(`(?:^|;\\s*)${t}\\s*=(?:[^;]*|$)`,"g");
            return [...document.cookie.matchAll(e)].length > 1
        }
    }
    ,
    79434: (t, e, i) => {
        function n(t) {
            const e = t.indexOf("+");
            return -1 !== e ? t.substring(e) : t
        }
        i.d(e, {
            l: () => n
        })
    }
    ,
    80419: (t, e, i) => {
        function n() {
            const t = {
                aecID: "",
                campID: "",
                channel: ""
            };
            return window._satellite && (t.aecID = _satellite.getVar("CC-visitorID") || ""),
            nn?.webstorage && (t.campID = nn.webstorage.getCookie("campID") || "",
            t.channel = nn.webstorage.getCookie("s_mtouch") || ""),
            t
        }
        i.d(e, {
            T: () => n
        })
    }
    ,
    80954: (t, e, i) => {
        function n(t, e=2) {
            if ("number" != typeof t || isNaN(t))
                throw new TypeError("The first argument must be a valid number.");
            if ("number" != typeof e || !Number.isInteger(e) || e < 0)
                throw new TypeError("The second argument must be a non-negative integer.");
            const i = 10 ** e;
            return (Math.sign(t) * (Math.round(Math.sign(t) * t * i) / i)).toFixed(e)
        }
        i.d(e, {
            U: () => n
        })
    }
    ,
    81712: (t, e, i) => {
        i.d(e, {
            d: () => s
        });
        var n = i(51967);
        async function s(t, e, i) {
            try {
                const n = await fetch(t, {
                    method: i.method || "POST",
                    headers: i.headers,
                    body: JSON.stringify(e)
                });
                return n.ok ? {
                    success: !0
                } : {
                    success: !1,
                    error: `Request failed with status ${n.status}`
                }
            } catch (t) {
                return (0,
                n.yA)("Request failed", t),
                {
                    success: !1,
                    error: t.message
                }
            }
        }
    }
    ,
    82355: (t, e, i) => {
        i.d(e, {
            Y: () => o
        });
        var n = i(33747)
          , s = i(86787);
        function o(t) {
            return Object.keys(t).reduce( (e, i) => ((0,
            n.G)(t[i]) ? e[i] = o(t[i]) : (0,
            s.K)(t[i]) && t[i].length ? e[i] = t[i] : e[i] = i,
            e), {})
        }
    }
    ,
    83391: (t, e, i) => {
        i.d(e, {
            GY: () => r,
            P5: () => s,
            Xz: () => o,
            Z4: () => c,
            mI: () => a,
            nr: () => l
        });
        var n = i(82355);
        const s = "lightbox__container"
          , o = {
            mobile: "mobile",
            desktop: "desktop"
        }
          , a = {
            [o.mobile]: ["xs", "s"],
            [o.desktop]: ["m", "l", "xl"]
        }
          , r = {
            rootWidthUpdate: 50,
            viewportResize: 200,
            scroll: 300,
            fieldInput: 700,
            normalFieldInput: 300
        }
          , l = {
            funds: "funds",
            etf: "etf",
            assetClass: "asset-class"
        }
          , c = (0,
        n.Y)({
            asc: "",
            desc: ""
        })
    }
    ,
    84597: (t, e, i) => {
        i.d(e, {
            b: () => s
        });
        var n = i(86787);
        function s(t) {
            if (!t || !(0,
            n.K)(t))
                return;
            let e;
            for (let i = 0; i < t.length; i++)
                e = Math.imul(31, e) + t.charCodeAt(i) || 0;
            return e
        }
    }
    ,
    84638: (t, e, i) => {
        i.d(e, {
            l: () => s
        });
        var n = i(61703);
        function s(t) {
            return (0,
            n.L)(t) && t ? "yes" : "no"
        }
    }
    ,
    84662: (t, e, i) => {
        i.d(e, {
            t: () => n
        });
        const n = {
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6
        }
    }
    ,
    84759: (t, e, i) => {
        i.d(e, {
            m: () => l
        });
        var n = i(38349)
          , s = i(35327)
          , o = i(21030)
          , a = i(87753)
          , r = i(83391);
        class l {
            constructor(t, e={}) {
                this.input = t.filterInput,
                this.list = t.filterList,
                this.clearButton = t.filterClearButton,
                this.ariaText = t.filterAriaTextElement,
                this.options = e,
                this.ariaTextTemplate = this.options.translations?.resultsText,
                this.count = 0,
                this.onClearButtonClick = this.onClearButtonClick.bind(this),
                this.onInputKeydown = this.onInputKeydown.bind(this),
                this.onInputDebounced = (0,
                a.s)(r.GY.normalFieldInput, this.onInput.bind(this)),
                this.init()
            }
            init() {
                this.addEventListeners(),
                this.ariaText && this.updateCountAriaAccessibility(this.list.length)
            }
            addEventListeners() {
                this.input.addEventListener("input", this.onInputDebounced),
                this.input.addEventListener("keydown", this.onInputKeydown),
                this.clearButton.addEventListener("click", this.onClearButtonClick)
            }
            onInput({target: t}) {
                const {value: e} = t;
                this.filter(e),
                this.clearButton.classList.toggle(n.N.isHidden, !e),
                this.ariaText && this.updateCountAriaAccessibility(this.count)
            }
            onClearButtonClick() {
                this.clear(),
                this.input.focus()
            }
            filter(t="") {
                const e = t.toLowerCase().trim()
                  , i = [];
                [...this.list]?.forEach(t => {
                    const s = t.textContent.toLowerCase().includes(e);
                    t.classList.toggle(n.N.isHidden, !s),
                    this.updateOptionAccessibility(t, s),
                    s && i.push(t)
                }
                ),
                this.count = i.length
            }
            clear() {
                this.input.value && (this.input.value = "",
                this.input.dispatchEvent(new Event("input")))
            }
            updateOptionAccessibility(t, e) {
                t.classList.toggle(s.aw.tabbableElement, e),
                t.setAttribute("tabindex", e ? "0" : "-1")
            }
            updateCountAriaAccessibility(t) {
                this.ariaText.textContent = t ? this.ariaTextTemplate?.replace("%count%", t) : this.options.translations?.noResultsText || ""
            }
            onInputKeydown(t) {
                t.key === o.f.enter && t.preventDefault()
            }
        }
    }
    ,
    86504: (t, e, i) => {
        i.d(e, {
            t: () => n
        });
        const n = "notSameLanguageLink"
    }
    ,
    86597: (t, e, i) => {
        i.d(e, {
            t: () => r
        });
        var n = i(51967);
        function s(t) {
            return Object.prototype.toString.call(t)
        }
        function o(t, e) {
            if (t === e)
                return !0;
            if (typeof t != typeof e)
                return !1;
            if ("number" == typeof t && isNaN(t) && isNaN(e))
                return !0;
            const i = s(t);
            if (i !== s(e))
                return !1;
            if ("[object Boolean]" === i || "[object String]" === i || "[object Number]" === i)
                return t.valueOf() === e.valueOf();
            if ("[object RegExp]" === i || "[object Date]" === i || "[object Error]" === i)
                return t.toString() === e.toString();
            if ("object" == typeof t || "function" == typeof t) {
                if ("[object Function]" === i && t.toString() !== e.toString())
                    return !1;
                const n = Object.keys(t)
                  , s = Object.keys(e);
                return n.length === s.length && !!n.every(t => Object.hasOwn(e, t)) && n.every(i => o(t[i], e[i]))
            }
            return !1
        }
        class a {
            #i = new Map;
            getCurrentChanges() {
                return new Map(this.#i)
            }
            addChange(t, e) {
                this.#i.set(t, e)
            }
            resetChanges() {
                this.#i.clear()
            }
            hasChanges() {
                return this.#i.size > 0
            }
        }
        class r {
            #n;
            #s;
            #o;
            #a = !1;
            #r = new a;
            #l;
            #c = !1;
            #d = !1;
            #h = "";
            constructor(t, e) {
                this.#d = e?.debug || !1,
                this.#h = e?.debugId || "";
                const {emitData: i, receiveData: n, dataChangesSettled: s} = t;
                this.#n = i,
                this.#s = n,
                this.#o = s
            }
            #u(t, ...e) {
                if (!this.#d)
                    return;
                const i = `[DataBinding${this.#h ? ` - ${this.#h}` : ""}] ${t}`;
                (0,
                n.$Z)(i, ...e)
            }
            async #p() {
                this.#c || (this.#u("Scheduling data emission"),
                this.#c = !0,
                await this.#o(),
                this.#c = !1,
                this.#m())
            }
            #m() {
                const t = this.#r.getCurrentChanges();
                this.#r.resetChanges(),
                this.#u("Emitting data", t),
                this.#n(t)
            }
            processDataChange(t, e) {
                this.#u(`Data change detected on "${t}" property`, e),
                this.#a && o(this.#l.get(t), e) ? this.#u(`Data change on "${t}" property doesn't need to be emitted`, e) : (this.#r.addChange(t, e),
                this.#p())
            }
            async processReceivedData(t) {
                this.#u("Processing received data", t),
                this.#a = !0,
                this.#l = t,
                this.#s(t),
                await this.#o(),
                this.#a = !1,
                this.#l = void 0,
                this.#r.hasChanges() && (this.#u("External source doesn't match the current state, scheduling a new data emission"),
                this.#p()),
                this.#u("Finished processing received data")
            }
        }
    }
    ,
    86787: (t, e, i) => {
        function n(t) {
            return "string" == typeof t
        }
        i.d(e, {
            K: () => n
        })
    }
    ,
    87753: (t, e, i) => {
        i.d(e, {
            W: () => s,
            s: () => n
        });
        const n = (t, e) => {
            let i;
            return function(...n) {
                i && clearTimeout(i),
                i = setTimeout( () => {
                    e(...n),
                    i = null
                }
                , t)
            }
        }
          , s = t => {
            clearTimeout(t)
        }
    }
    ,
    88312: (t, e, i) => {
        i.d(e, {
            P: () => a,
            g: () => r
        });
        let n = null;
        function s() {
            return n || (n = new Set([...document.querySelectorAll("script[src]")].map(t => t.src))),
            n
        }
        function o(t) {
            return new Promise( (e, i) => {
                const n = document.createElement("script");
                n.src = t,
                n.onload = () => {
                    s().add(t),
                    e(t)
                }
                ,
                n.onerror = () => i(n),
                document.body.appendChild(n)
            }
            )
        }
        async function a(t) {
            const e = [...new Set(t)].filter(t => !function(t) {
                return s().has(t)
            }(t))
              , i = e.map(t => function(t) {
                return new Promise( (e, i) => {
                    const n = document.createElement("link");
                    n.href = t,
                    n.as = "script",
                    n.rel = "preload",
                    n.onload = () => {
                        e(t)
                    }
                    ,
                    n.onerror = () => i(n),
                    document.head.appendChild(n)
                }
                )
            }(t));
            await Promise.all(i);
            for (let t = 0; t < e.length; t++) {
                const i = e[t];
                await o(i)
            }
            return new Promise(t => {
                setTimeout( () => {
                    t(e)
                }
                )
            }
            )
        }
        async function r(t) {
            const e = [...t.querySelectorAll("script[src]")];
            e && (function(t) {
                t && t.forEach(t => {
                    t.parentNode.removeChild(t)
                }
                )
            }(e),
            await a(e.map(t => t.src)))
        }
    }
    ,
    88363: (t, e, i) => {
        function n(t, e) {
            t >= 0 && e.splice(t, 1)
        }
        i.d(e, {
            u: () => n
        })
    }
    ,
    88835: (t, e, i) => {
        function n(t) {
            return "number" == typeof t && !isNaN(t)
        }
        i.d(e, {
            E: () => n
        })
    }
    ,
    89777: (t, e, i) => {
        function n(t) {
            const e = [...t.querySelectorAll('link[rel="stylesheet"]')]
              , i = [];
            return e.forEach(t => {
                if (document.querySelector(`link[href="${t.href}"]`))
                    return;
                const e = document.createElement("link");
                e.rel = "stylesheet",
                e.href = t.href,
                document.body.appendChild(e),
                t.parentNode.removeChild(t),
                i.push(e)
            }
            ),
            i
        }
        i.d(e, {
            u: () => n
        })
    }
    ,
    92478: (t, e, i) => {
        i.d(e, {
            $v: () => p,
            At: () => r,
            Bt: () => b,
            GN: () => m,
            Nz: () => v,
            W$: () => a,
            Wz: () => c,
            aB: () => u,
            bt: () => o,
            gW: () => l,
            j2: () => h,
            kl: () => g,
            ns: () => f,
            pM: () => d,
            xk: () => w
        });
        var n = i(38349)
          , s = i(83391);
        function o(t, e) {
            return t.matches(e) ? t : t.querySelector(e)
        }
        function a(t) {
            return !(!t || !t.closest(`.${s.P5}`))
        }
        function r(t) {
            const e = document.createDocumentFragment()
              , i = 0 === t.trim().indexOf("<tr") ? "tbody" : "div"
              , n = document.createElement(i);
            n.innerHTML = t;
            const s = n.children
              , o = s.length;
            for (let t = 0; t < o; t++)
                e.appendChild(s[0]);
            return e
        }
        function l(t, e) {
            !function(t) {
                for (; t.firstChild; )
                    t.removeChild(t.firstChild)
            }(t),
            e && t.appendChild(e)
        }
        function c(t) {
            if (!t)
                return "";
            const e = document.createElement("div");
            return e.appendChild(t.cloneNode(!0)),
            e.innerHTML
        }
        function d(t, e) {
            return t.classList.contains(e) ? t : t.closest(`.${e}`)
        }
        function h(t, e) {
            t.setAttribute(e, "false" === t.getAttribute(e))
        }
        const u = {
            behavior: "smooth"
        };
        function p(t, e=u) {
            (function(t) {
                const e = t.getBoundingClientRect()
                  , i = window.innerHeight || document.documentElement.clientHeight
                  , n = window.innerWidth || document.documentElement.clientWidth;
                return e.top >= 0 && e.left >= 0 && e.bottom <= i && e.right <= n
            }
            )(t) || setTimeout( () => {
                t.scrollIntoView(e)
            }
            )
        }
        function m(t, e) {
            const i = ["class", "name", "data-nn-init", "data-nc", "role"]
              , n = e.getAttribute("id")
              , s = [...n ? [n] : [], ...[...e.querySelectorAll("[id]")].map(t => t.getAttribute("id"))].filter(e => !e.endsWith(t));
            if (!s.length)
                return;
            const o = new RegExp(`(\\b${s.join("\\b|\\b")}\\b)`,"g");
            [e, ...e.querySelectorAll("*")].forEach(e => {
                [...e.attributes].forEach(e => {
                    const {name: n, value: s} = e;
                    if (i.includes(n))
                        return;
                    const a = s.match(o);
                    if (a) {
                        const i = [...new Set(a)];
                        let n = s;
                        i.forEach(e => {
                            n = n.replaceAll(new RegExp(`\\b${e}\\b`,"g"), `${e}${t}`)
                        }
                        ),
                        e.value = n
                    }
                }
                )
            }
            )
        }
        function g(t) {
            t.classList.remove(n.N.isHidden)
        }
        function b(t) {
            t.classList.add(n.N.isHidden)
        }
        function f(t, e=!1) {
            t.classList.toggle(n.N.isHidden, e)
        }
        function v(t) {
            t.remove()
        }
        function w(t, e=document, i=1e4) {
            return new Promise( (n, s) => {
                const o = performance.now();
                requestAnimationFrame(function a() {
                    const r = performance.now() - o
                      , l = e.querySelector(t);
                    return l ? n(l) : r > i ? s(new Error(`Element not found within ${i / 1e3} seconds`)) : void requestAnimationFrame(a)
                })
            }
            )
        }
    }
    ,
    92910: (t, e, i) => {
        function n(t) {
            if (!Array.isArray(t))
                throw new TypeError("Input must be an array.");
            const e = t.length;
            if (0 === e)
                throw new Error("Cannot calculate the geometric mean of an empty array.");
            return t.forEach(t => {
                if ("number" != typeof t || t <= 0 || isNaN(t))
                    throw new Error("All array elements must be positive numbers.")
            }
            ),
            t.reduce( (t, e) => t * e, 1) ** (1 / e)
        }
        i.d(e, {
            l: () => n
        })
    }
    ,
    93461: (t, e, i) => {
        function n() {
            const t = document.documentElement.getAttribute("dir");
            return "rtl" === t?.toLowerCase() || !1
        }
        i.d(e, {
            a: () => n
        })
    }
    ,
    94497: (t, e, i) => {
        function n(t, e, i) {
            return Math.min(Math.max(t, e), i)
        }
        i.d(e, {
            N: () => n
        })
    }
    ,
    95424: (t, e, i) => {
        i.d(e, {
            A: () => a
        });
        var n = i(51967);
        class s {
            constructor() {
                if (s.instance)
                    return s.instance;
                this.state = new Map,
                this.eventTarget = document,
                s.instance = this
            }
            dispatch(t, e) {
                t && "string" == typeof t || (0,
                n.aO)("Event name must be a non-empty string"),
                this.state.set(t, e);
                const i = new CustomEvent(t,e);
                return this.eventTarget.dispatchEvent(i)
            }
            listen(t, e) {
                if (!t || "string" != typeof t)
                    throw new Error("Event name must be a non-empty string");
                if ("function" != typeof e)
                    throw new Error("Callback must be a function");
                if (this.eventTarget.addEventListener(t, e),
                this.state.has(t)) {
                    const i = this.state.get(t)
                      , s = new CustomEvent(t,i);
                    try {
                        e(s)
                    } catch (e) {
                        (0,
                        n.yA)(`Error in listener for ${t}:`, e)
                    }
                }
                return () => {
                    this.eventTarget.removeEventListener(t, e)
                }
            }
            clearAll() {
                this.state.clear()
            }
        }
        const o = new s;
        o.clearAll();
        const a = o
    }
    ,
    95480: (t, e, i) => {
        i.d(e, {
            B: () => n,
            e: () => s
        });
        const n = {
            secureform: "secureform",
            formField: "newform__field",
            formFieldHidden: "newform__field--hidden"
        }
          , s = {
            formValidate: "data-validate",
            previousType: "data-previous-type",
            hiddenValue: "hidden",
            disabled: "disabled"
        }
    }
    ,
    98451: (t, e, i) => {
        i.d(e, {
            u: () => s
        });
        var n = i(20495);
        function s(t) {
            return (0,
            n.c)(t) && t.length > 0
        }
    }
}]);
