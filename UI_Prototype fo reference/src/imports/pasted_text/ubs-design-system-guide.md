





UBS DESIGN SYSTEM
COMPLETE THEME & LAYOUT INSTRUCTIONS
The Definitive Reference for Developers and Designers




Every color, font, spacing, sizing, and layout rule documented in one place.
If you follow this document exactly, your implementation will match the UBS design system.










Based on: Business Expense Management Tool  |  Figma Make Export
 
 
TABLE OF CONTENTS

1.  The Font System (Frutiger Family)
2.  The Color System (Every Single Color)
3.  The Grid & Layout System
4.  Typography Scale (Every Text Size, Weight & Line-Height)
5.  Component: Header (Primary Navigation Bar)
6.  Component: Page Headline
7.  Component: Section Header
8.  Component: Double Image
9.  Component: Service Cards
10. Component: Carousel (3 Variants)
11. Component: Footer / Doormat
12. Component: Privacy / Cookie Banner
13. Spacing & Sizing Cheat Sheet
14. Responsive Breakpoints
15. Border Radius & Shadows
16. Interaction States (Hover, Focus, Active)
17. Dark Mode Override
18. Quick-Start Checklist
 
1. THE FONT SYSTEM
This design system uses ONE primary font family: Frutiger. This is the official UBS corporate typeface. Every single piece of text in this design uses Frutiger. There are no exceptions.

IMPORTANT: The font-family CSS value must ALWAYS be: Frutiger, Arial, Helvetica, sans-serif. If Frutiger is not available on the user's machine, it falls back to Arial, then Helvetica, then the system sans-serif. NEVER use just 'Frutiger' alone.

1.1 Font Files Required
You need four weight files of Frutiger. These must be loaded via @font-face in CSS:

Weight Name	CSS Weight	File Name	When To Use
Frutiger Light	300	Frutiger-Light.woff2	Headlines, body text, captions, info text, lead text, ALL normal text
Frutiger Regular	400	Frutiger-Regular.woff2	Form inputs only
Frutiger Medium	500	Frutiger-Medium.woff2	Buttons, labels, footer column titles, nav links, cookie banner buttons
Frutiger Bold	700	Frutiger-Bold.woff2	Reserved for extreme emphasis (rarely used in this design)

IMPORTANT: font-weight: 300 (Light) is the DOMINANT weight in this design. Almost ALL text — headlines, body, captions, descriptions — uses weight 300 (Light). This gives UBS its characteristic elegant, thin look. If something looks 'too heavy' or 'too bold', you probably forgot to set font-weight: 300.

1.2 @font-face CSS Code (Copy This Exactly)
@font-face {   font-family: 'Frutiger';   src: url('/src/fonts/Frutiger-Light.woff2') format('woff2'),        url('/src/fonts/Frutiger-Light.woff') format('woff');   font-weight: 300;   font-style: normal;   font-display: swap; }  @font-face {   font-family: 'Frutiger';   src: url('/src/fonts/Frutiger-Regular.woff2') format('woff2'),        url('/src/fonts/Frutiger-Regular.woff') format('woff');   font-weight: 400;   font-style: normal;   font-display: swap; }  @font-face {   font-family: 'Frutiger';   src: url('/src/fonts/Frutiger-Medium.woff2') format('woff2'),        url('/src/fonts/Frutiger-Medium.woff') format('woff');   font-weight: 500;   font-style: normal;   font-display: swap; }  @font-face {   font-family: 'Frutiger';   src: url('/src/fonts/Frutiger-Bold.woff2') format('woff2'),        url('/src/fonts/Frutiger-Bold.woff') format('woff');   font-weight: 700;   font-style: normal;   font-display: swap; }

1.3 Base Font Size
The HTML root font-size is 16px. All rem-based sizes in this document are calculated relative to this 16px base.
html { font-size: 16px; }    /* This is the --font-size variable */
 
2. THE COLOR SYSTEM (EVERY SINGLE COLOR)
Below is every color used in this design system. These are defined as CSS custom properties (variables). Use the variable name, not the hex value, so themes can be changed globally.

2.1 UBS Brand Colors
Variable Name	Hex Value	Where It Is Used
--col-background-brand	#E60000	UBS Red: impulse line, underline bars, carousel active dots, doormat link hover underline, ALL red accents
--col-text-primary	#000000	All primary text: headlines, body, info text
--col-text-subtle	#666666	Captions, footer titles, footer links, counter text, muted labels
--col-text-inverted	#FFFFFF	Text on dark backgrounds: cookie banner text, hero captions
--col-background-primary	#000000	Cookie/privacy banner background
--col-background-ui-10	#FFFFFF	Footer background, card carousel background, white surfaces
--col-border-illustrative	#E0E0E0	Footer top border, carousel inactive dots
--col-border-inverted	#FFFFFF	Cookie banner button borders
--col-link-text-brand	#E60000	Red links
--col-link-text-brand-visited	#B30000	Visited red links
--col-link-text-brand-hovered	#CC0000	Hovered red links
--col-link-text-primary	#000000	Doormat links on hover/focus/active
--col-link-text-inverted	#FFFFFF	Links on dark backgrounds (privacy banner)
--col-link-text-inverted-hovered	#CCCCCC	Hovered links on dark backgrounds
--col-link-text-subtle	#666666	Subtle contextual links

2.2 UI Surface & Component Colors
Variable Name	Hex Value	Where It Is Used
--background	#FFFFFF	Page background
--primary	#030213	Deep navy-black: primary buttons, primary foreground
--muted	#ECECF0	Muted backgrounds
--muted-foreground	#717182	Muted text color
--accent	#E9EBEF	Accent backgrounds
--destructive	#D4183D	Destructive/error actions
--input-background	#F3F3F5	Input field backgrounds
--switch-background	#CBCED4	Toggle switch off-state background
--border	rgba(0,0,0,0.1)	General borders (10% black)

2.3 Specific Component Colors (Hardcoded in Components)
Element	Color	Details
Header background	#FFFFFF (bg-white)	White with bottom border
Header border	gray-200 (#E5E7EB)	1px bottom border
Nav link default	gray-700 (#374151)	Navigation links
Nav link hover	gray-900 (#111827)	Navigation links on hover
CTA button bg	red-600 (#DC2626)	Primary call-to-action (Get Started)
CTA button hover	red-700 (#B91C1C)	CTA button hover state
Page background	gray-50 (#F9FAFB)	Main content area behind cards
Service cards bg	#FFFFFF (bg-white)	Service card backgrounds
Service card text	gray-600 (#4B5563)	Service card descriptions
Hero carousel bg	#000000 (bg-black)	Hero variant carousel container
Hero gradient	from-black/70 to-transparent	Bottom gradient overlay on hero
Hero text overlay	rgba(255,255,255,0.85)	Hero slide descriptions
Arrow buttons hero	bg-white/20, hover bg-white/40	Carousel arrows (hero variant)
Arrow buttons default	bg-white/80, hover bg-white	Carousel arrows (default) + shadow
 
3. THE GRID & LAYOUT SYSTEM
3.1 Grid Variables
Variable	Value	Meaning
--grid-absolute-gutter	20px	Space between every two columns
--grid-absolute-col-width	60px	Width of one grid column
--grid-absolute-cols	24	Total number of columns in the grid
--grid-container-width	1920px	Maximum width of the entire layout

3.2 Container Rules
•	The outermost container has max-width: 1920px and is centered with mx-auto
•	Horizontal padding on the container: px-8 (32px on each side)
•	Vertical padding on main content sections: py-12 (48px top and bottom)
•	The default carousel content area (non-hero) constrains to max-w-[1200px]
•	Card carousel constrains to max-w-[960px]
•	Hero carousel is full-width (no max-width constraint)

3.3 Content Width Formulas
When the design calculates column-based widths (used in PageHeadline wrapper):
width: calc(16 / 24 * 100% - 20px * (24 - 16) / 24)
This means: the content takes up 16 of 24 columns on medium screens and above.

3.4 Double Image Split Formula
Each image in a DoubleImage pair takes exactly half the width minus one gutter:
width: calc((100% - var(--grid-absolute-gutter)) / 2) marginRight: var(--grid-absolute-gutter)    /* only on the left image */
 
4. TYPOGRAPHY SCALE (EVERY TEXT SIZE)
This is the complete list of every font-size / line-height / font-weight combination used in this design. The 'Breakpoint' column tells you at which screen width this size kicks in.

IMPORTANT: Almost all text uses font-weight: 300 (Light). The few exceptions are explicitly called out as weight 500 (Medium). When in doubt, use 300.

4.1 Page Headlines
Size Variant	Breakpoint	Font Size	Line Height	Weight	CSS Example
Large	Default (mobile)	1.6875rem (27px)	1.9375rem (31px)	300	font: 300 1.6875rem/1.9375rem Frutiger...
Large	≥768px (md)	2.375rem (38px)	2.8125rem (45px)	300	
Large	≥1024px (lg)	3.125rem (50px)	3.75rem (60px)	300	
Large	≥1280px (xl)	3.75rem (60px)	4.5rem (72px)	300	
Medium	Default	2rem (32px)	2.5rem (40px)	300	font: 300 2rem/2.5rem Frutiger...
Medium	≥1280px (xl)	3rem (48px)	3.5625rem (57px)	300	
Small	Default	1.75rem (28px)	2.0625rem (33px)	300	font: 300 1.75rem/2.0625rem Frutiger...
Small	≥768px (md)	2.5rem (40px)	3rem (48px)	300	
Leadtext	Default	1.625rem (26px)	1.875rem (30px)	300	font: 300 1.625rem/1.875rem Frutiger...
Leadtext	≥768px (md)	2.5rem (40px)	2.625rem (42px)	300	
Leadtext	≥1280px (xl)	3.125rem (50px)	3.375rem (54px)	300	

4.2 Caption Text (Above Headlines)
Breakpoint	Font Size	Line Height	Weight	Color
Default	1rem (16px)	1.625rem (26px)	300	--col-text-subtle (#666)
≥1024px (lg)	0.875rem (14px)	1.375rem (22px)	300	--col-text-subtle (#666)
≥1280px (xl)	1rem (16px)	1.625rem (26px)	300	--col-text-subtle (#666)
≥1440px (2xl)	1.0625rem (17px)	1.6875rem (27px)	300	--col-text-subtle (#666)

4.3 Info Text (Below Headlines)
Breakpoint	Font Size	Line Height	Weight	Color
Default	1.25rem (20px)	1.75rem (28px)	300	--col-text-primary (#000)
≥1280px (xl)	1.5rem (24px)	2.25rem (36px)	300	--col-text-primary (#000)

4.4 Lead Text (Smaller Subheading)
Breakpoint	Font Size	Line Height	Weight	Color
Default	1.25rem (20px)	1.5rem (24px)	300	--col-text-primary (#000)
≥768px (md)	1.375rem (22px)	1.625rem (26px)	300	--col-text-primary (#000)
≥1024px (lg)	1.25rem (20px)	1.5rem (24px)	300	--col-text-primary (#000)
≥1280px (xl)	1.375rem (22px)	1.625rem (26px)	300	--col-text-primary (#000)

4.5 Section Header Headlines
Keyline Variant	Breakpoint	Font Size	Line Height	Weight
Default	Default	1.75rem (28px)	2.0625rem (33px)	300
Default	≥768px (md)	2.5rem (40px)	3rem (48px)	300
Large	Default	1.5rem (24px)	2.25rem (36px)	300
Large	≥1280px (xl)	2rem (32px)	3rem (48px)	300

4.6 Other Text Styles
Element	Font Size	Line Height	Weight	Color	Notes
Header logo text ('FRAME')	0.8125rem (13px)	1rem (16px)	300	#666666	Positioned next to logo
Navigation links	0.875rem (14px)	auto	500	gray-700	text-sm font-medium
Header buttons	0.875rem (14px)	auto	500	gray-700/white	Login / Get Started
Service card heading	1.25rem (20px)	auto	500	inherit	text-xl font-medium
Service card body	base (1rem)	auto	400	gray-600	text-gray-600
Carousel caption	0.875rem (14px)	1.375rem (22px)	300	white/subtle	Variant-dependent
Carousel headline	1.5rem → 2rem	1.875rem → 2.5rem	300	white/primary	Responsive
Carousel description	1rem (16px)	1.625rem (26px)	300	rgba(255,255,255,0.85)	Hero only
Carousel counter	0.875rem (14px)	1.375rem (22px)	300/500	#666 / #000	Active num is 500
Footer column title	0.875rem (14px)	1.25rem (20px)	500	#666666	font: 500 0.875rem/1.25rem
Footer links	0.875rem (14px)	1.25rem (20px)	300	#666666	font: 300 0.875rem/1.25rem
Cookie banner text	0.875rem → 1rem	1.375rem → 1.5rem	300	#FFFFFF	Responsive at xl
Cookie banner buttons	0.75rem (12px)	0.99rem (15.84px)	500	white/black	font: 500 0.75rem/0.99rem
 
5. COMPONENT: HEADER (Primary Navigation Bar)
The header is a sticky top bar. Here is every detail:

5.1 Container
•	Full-width (w-full), background: white (bg-white)
•	Bottom border: 1px solid gray-200 (#E5E7EB)
•	Inner content: max-width 1920px, centered, horizontal padding 32px (px-8), vertical padding 12px (py-3)
•	Layout: flexbox, items-center, justify-between (logo left, nav center, buttons right)

5.2 Logo
•	UBS logo image: width 83px (w-[83px]), min-width 83px, height auto
•	Next to logo: text 'FRAME' in 0.8125rem (13px), line-height 1rem (16px), font-weight 300 (light), color #666666

5.3 Navigation Links
•	Horizontal row with gap: 32px (gap-8) between each link
•	Font: 0.875rem (14px), weight 500 (medium)
•	Color: gray-700 (#374151), hover: gray-900 (#111827)
•	Transition: transition-colors (smooth color change on hover)

5.4 Action Buttons
•	Gap between buttons: 16px (gap-4)
•	Login button: padding 16px horizontal, 8px vertical, text gray-700, no background, no border
•	Get Started button: padding 24px horizontal (px-6), 8px vertical (py-2), bg red-600 (#DC2626), text white, rounded corners (rounded = 4px), hover bg red-700 (#B91C1C)
 
6. COMPONENT: PAGE HEADLINE
The page headline is the main title area on a page. It has an optional red 'impulse line' on the left side.

6.1 The Impulse Line (Red Left Bar)
•	A vertical red bar on the left side of the headline block
•	Color: --col-background-brand (#E60000)
•	Width: 4px
•	Positioned using CSS ::before pseudo-element, absolute left:0
•	Top and bottom inset: 0.9375rem (15px) from each edge
•	Content padding-left: 20px (default) or 24px (at ≥1280px)

IMPORTANT: The impulse line is the signature visual element. It is a 4px wide, UBS Red (#E60000) vertical bar that runs along the left edge of headline blocks. It MUST have 15px inset from top and bottom.

6.2 Vertical Spacing (Outer Margins)
Breakpoint	Margin Top & Bottom	CSS
Default (mobile)	1.5rem (24px)	margin-block: 1.5rem
≥768px (md)	2rem (32px)	margin-block: 2rem
≥1024px (lg)	3rem (48px)	margin-block: 3rem
≥1280px (xl)	3.75rem (60px)	margin-block: 3.75rem

6.3 Internal Spacing
•	Gap between caption and headline: margin-top 0.25rem (4px), at xl: 0.5rem (8px)
•	Gap between headline and info text: margin-top 0.5rem (8px), at xl: 0.75rem (12px)
•	Gap between headline and lead text: margin-top 1.4375rem (23px)
 
7. COMPONENT: SECTION HEADER
Section headers introduce content sections. They have two variants based on 'keyline' type.

7.1 Default Keyline (with red underline)
•	Headline font: see Section 4.5 for sizes
•	Below headline: a red underline bar
•	Underline height: 4px
•	Underline width: 60px (default), 80px (at ≥768px)
•	Underline margin-top: 0.5rem (8px) default, 0.75rem (12px) at ≥768px
•	Underline color: --col-background-brand (#E60000)
•	Info line margin-top below underline: 16px (default), 24px (at ≥768px)

7.2 Large Keyline (no underline)
•	No red underline bar is shown
•	Info line margin-top: 12px (default), 16px (at ≥768px)

7.3 Spacing Below Variants
Variant	Default	≥1024px	≥1280px
none	0	0	0
medium	24px	24px	36px
large	32px	40px	48px
 
8. COMPONENT: DOUBLE IMAGE
Displays two images side-by-side with an optional vertical offset on one side.

•	Container: display flex (horizontal)
•	Each image width: calc((100% - 20px) / 2)
•	Gap between: 20px margin-right on the left image
•	Images: width 100%, height auto, object-fit cover

8.1 Alignment Offset
Align Prop	Left Image Offset	Right Image Offset
'none'	No offset	No offset
'right'	padding-top: 3.75em (60px), lg: 5em (80px)	No offset
'left'	No offset	padding-top: 3.75em (60px), lg: 5em (80px)
 
9. COMPONENT: SERVICE CARDS
The service cards are laid out in a 3-column grid:
•	Grid: grid-cols-1 (mobile) → grid-cols-3 (md+)
•	Gap between cards: 32px (gap-8)
•	Bottom margin of grid: 64px (mb-16)
•	Each card: bg-white, padding 24px (p-6), rounded-lg (8px), shadow-sm
•	Card title: text-xl (1.25rem/20px), font-medium (500), margin-bottom 8px (mb-2)
•	Card description: text-gray-600 (#4B5563)
 
10. COMPONENT: CAROUSEL (3 Variants)
10.1 Variant Heights
Variant	Default Height	XL Height (≥1280px)
default	400px	500px
hero	500px	640px
card	320px	400px

10.2 Slide Transitions
•	Transition type: opacity crossfade (NOT sliding)
•	Duration: 400ms
•	Easing: ease-in-out
•	Active slide: opacity 1, z-index 10
•	Inactive slides: opacity 0, z-index 0

10.3 Arrow Buttons
•	Position: absolute, vertically centered (top-1/2 -translate-y-1/2)
•	Left arrow: left 12px, xl: left 20px
•	Right arrow: right 12px, xl: right 20px
•	Size: 40x40px (w-10 h-10), xl: 48x48px (w-12 h-12)
•	Shape: fully rounded (rounded-full)
•	Icon size: 20x20px (w-5 h-5), xl: 24x24px (w-6 h-6)
•	Z-index: 30

10.4 Indicator Dots
•	Container: flexbox, centered, gap 8px (gap-2)
•	Each dot: 10x10px (w-2.5 h-2.5), fully rounded
•	Active dot: bg --col-background-brand (#E60000), scale 1.1
•	Inactive dot: bg --col-border-illustrative (#E0E0E0), hover gray-400
•	Active dot with autoplay: 3px outer ring, border-color #E60000

10.5 Controls Bar
•	Padding: py-4 px-4, xl: py-5
•	Layout: flex items-center justify-center gap-4
•	Autoplay button: 32x32px, rounded-full, icon 16x16px
•	Counter: active number color #000 weight 500, separator and total color #666 weight 300

10.6 Gradient Overlays (Hero/Card)
•	Left gradient: absolute, left 0, width 64px, xl: 96px
•	Right gradient: absolute, right 0, width 64px, xl: 96px
•	Hero: from-black/30 to-transparent
•	Default/Card: from-white/40 to-transparent
•	Z-index: 20, pointer-events: none
 
11. COMPONENT: FOOTER / DOORMAT
The footer is called 'Doormat' in the UBS design system. Here is every detail:

11.1 Container
•	Background: --col-background-ui-10 (#FFFFFF)
•	Top border: 1px solid --col-border-illustrative (#E0E0E0)
•	Vertical padding: py-12 (48px), lg: py-16 (64px)
•	Inner content: max-width 1920px, centered, px-8 (32px)

11.2 Column Grid
•	4 columns on large screens: grid-cols-1 → md:grid-cols-2 → lg:grid-cols-4
•	Gap: 32px (gap-8), lg: 48px (gap-12)

11.3 Column Title
•	Font: 500 0.875rem/1.25rem Frutiger, Arial, Helvetica, sans-serif (14px, weight Medium)
•	Color: --col-text-subtle (#666666)
•	Padding: py-1 (4px vertical)

11.4 Column Links
•	Font: 300 0.875rem/1.25rem Frutiger (14px, weight Light)
•	Color: --col-text-subtle (#666666)
•	No text-decoration (no underline by default)
•	List margin-top: 8px (mt-2)
•	Gap between links: margin-top 0.25rem (4px) between items

11.5 Link Hover Animation (Critical Detail!)
The doormat links have a unique animated underline effect that slides in from left on hover:
•	Default state: a transparent underline that covers 100% width (invisible)
•	Second background layer: UBS Red (#E60000) underline at 0% width
•	On hover/focus/active: the red underline grows to 100% width, the transparent one shrinks to 0%
•	The text color changes to --col-link-text-primary (#000000)
•	Transition: background-size 0.2s cubic-bezier(1, 0, 0.3, 1)

background-image:   linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0)),   linear-gradient(var(--col-background-brand), var(--col-background-brand)); background-size: 100% 1px, 0 1px; background-position: 100% 100%, 0 100%; background-repeat: no-repeat; transition: background-size 0.2s cubic-bezier(1, 0, 0.3, 1);  /* On hover: */ background-size: 0 1px, 100% 1px;
 
12. COMPONENT: PRIVACY / COOKIE BANNER
12.1 Container
•	Position: fixed, bottom: 0, left: 0, right: 0
•	Z-index: 99999 (always on top of everything)
•	Background: --col-background-primary (#000000)
•	Inner content: max-width 1920px, centered, padding 32px horizontal
•	Padding top/bottom: 1.25rem (20px)
•	Layout: column on mobile, row on xl (flex-col → xl:flex-row xl:items-center xl:justify-between)
•	Gap: 1.25rem (20px) vertical, 40px horizontal

12.2 Banner Text
•	Font: 300 0.875rem/1.375rem (14px) on mobile, 1rem/1.5rem (16px) at xl
•	Color: --col-text-inverted (#FFFFFF)
•	Privacy Policy link: underlined, color --col-link-text-inverted (#FFFFFF), hover #CCCCCC
•	Underline: thickness 0.0625rem (1px), offset 0.125rem (2px)

12.3 Buttons
•	Layout: column on mobile, row at ≥768px, flex-shrink: 0
•	Gap: 0.75rem (12px)
•	Width: 100% on mobile, auto on md+
•	Padding: 0.5rem (8px) vertical, 16px horizontal
•	Font: 500 0.75rem/0.99rem (12px, weight Medium)
•	Text-align: center

12.4 Button Variants
Button	Text Color	Background	Border
Cookie Settings	#FFFFFF	transparent	1px solid #FFFFFF
Reject All	#FFFFFF	transparent	1px solid #FFFFFF
Accept All	#000000	#FFFFFF	1px solid #FFFFFF
 
13. SPACING & SIZING CHEAT SHEET
Quick reference for all spacing values used throughout the design:

Tailwind Class	Pixel Value	Where Used
px-8	32px	Container horizontal padding (everywhere)
py-3	12px	Header vertical padding
py-12	48px	Main content vertical sections
py-16	64px	Footer vertical padding (lg)
gap-4	16px	Button groups, controls bar
gap-8	32px	Nav links, card grid, footer columns
gap-12	48px	Footer columns (lg)
mb-2	8px	Card heading bottom margin
mb-16	64px	Card grid bottom margin
p-6	24px	Card internal padding
mt-2	8px	Footer link list top margin
mb-12	48px	Default carousel bottom margin
 
14. RESPONSIVE BREAKPOINTS
These are the Tailwind CSS breakpoints used throughout the design. Every responsive change happens at one of these exact widths:

Prefix	Min Width	Typical Devices	Key Changes At This Breakpoint
(none)	0px	Small phones	Base/mobile styles
md:	768px	Tablets, small laptops	2-col footer, row buttons, larger headlines
lg:	1024px	Laptops	4-col footer, large headline sizes
xl:	1280px	Desktops	Max font sizes, banner goes horizontal
2xl:	1440px	Wide desktops	Caption text slightly larger (17px)
 
15. BORDER RADIUS & SHADOWS
15.1 Border Radius
Variable / Class	Value	Used On
--radius	0.625rem (10px)	Base radius value
--radius-sm	calc(0.625rem - 4px) = 6px	Small elements
--radius-md	calc(0.625rem - 2px) = 8px	Medium elements
--radius-lg	0.625rem = 10px	Large elements
--radius-xl	calc(0.625rem + 4px) = 14px	Extra large elements
rounded (Tailwind)	4px	CTA button in header
rounded-lg (Tailwind)	8px	Service cards
rounded-full	9999px	Carousel arrow buttons, indicator dots

15.2 Shadows
Class	CSS Value	Used On
shadow-sm	0 1px 2px rgba(0,0,0,0.05)	Service cards
shadow-md	0 4px 6px -1px rgba(0,0,0,0.1)	Default carousel arrow buttons
 
16. INTERACTION STATES
16.1 Transitions
•	All color transitions: transition-colors (150ms ease)
•	Carousel slide crossfade: transition-opacity duration-[400ms] ease-in-out
•	Arrow button opacity: transition-all duration-200
•	Indicator dot scaling: transition-all duration-300
•	Gradient overlay visibility: transition-opacity duration-300
•	Doormat link underline: background-size 0.2s cubic-bezier(1, 0, 0.3, 1)

16.2 Hover States Summary
Element	Default State	Hover State
Nav links	gray-700	gray-900
CTA button	bg red-600	bg red-700
Doormat links	color #666, no underline	color #000, red underline slides in
Carousel arrows (hero)	bg white/20	bg white/40
Carousel arrows (default)	bg white/80	bg white (fully opaque)
Inactive dots	bg #E0E0E0	bg gray-400
Autoplay toggle	transparent	bg gray-100
Privacy link	#FFFFFF	#CCCCCC

16.3 Carousel Swipe / Drag
•	Minimum swipe distance: 35px
•	Uses PointerEvents (works on both mouse and touch)
•	Keyboard: ArrowLeft / ArrowRight navigation
•	Autoplay pauses on mouse hover, resumes on mouse leave
 
17. DARK MODE OVERRIDE
The design includes dark mode variables applied when the .dark class is on the root. Key overrides:

Variable	Light Mode	Dark Mode
--background	#FFFFFF	oklch(0.145 0 0) ≈ #262626
--foreground	oklch(0.145 0 0) ≈ #262626	oklch(0.985 0 0) ≈ #FAFAFA
--primary	#030213	oklch(0.985 0 0) ≈ #FAFAFA
--muted	#ECECF0	oklch(0.269 0 0) ≈ #444444
--border	rgba(0,0,0,0.1)	oklch(0.269 0 0) ≈ #444444
--destructive	#D4183D	oklch(0.396 0.141 25.723)

TIP: Dark mode is activated by adding class='dark' to the HTML element or any ancestor. The CSS selector used is &:is(.dark *).
 
18. QUICK-START CHECKLIST
Follow this checklist to make sure your implementation is correct. Check off each item:

1.	Load all 4 Frutiger font files (Light 300, Regular 400, Medium 500, Bold 700) via @font-face
2.	Set html font-size to 16px
3.	Set the font-family everywhere: Frutiger, Arial, Helvetica, sans-serif
4.	Use font-weight 300 (Light) by default — only use 500 for buttons, labels, nav links, footer titles
5.	Define ALL CSS custom properties from Section 2 in your :root selector
6.	Set max-width 1920px on all content containers, centered with auto margins
7.	Use px-8 (32px) horizontal padding on all content areas
8.	The impulse line is 4px wide, UBS Red (#E60000), with 15px top/bottom inset
9.	Section header underline is 4px height, 60px→80px width, UBS Red
10.	Cookie banner is fixed to bottom, z-index 99999, full-width black background
11.	Footer links have the animated red underline slide-in effect on hover
12.	All carousel transitions are opacity-based crossfades at 400ms, NOT horizontal slides
13.	Test all 5 breakpoints: mobile (default), 768px, 1024px, 1280px, 1440px
14.	Verify the UBS logo is exactly 83px wide


IMPORTANT: If your implementation looks too bold, too heavy, or too 'thick' compared to the design, the #1 mistake is forgetting to set font-weight: 300. The UBS design aesthetic is thin, elegant, and airy. Weight 300 everywhere is the key.

END OF THEME INSTRUCTIONS
