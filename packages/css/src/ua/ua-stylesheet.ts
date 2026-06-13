/**
 * Built-in user-agent stylesheet, curated to the v1 tag set. Values mirror common
 * browser defaults, pragmatically adapted to RN. Margins use em so they scale with
 * font-size and resolve in the compute pass.
 */
export const UA_STYLESHEET = `
p { display: block; margin: 1em 0 }
div { display: block }
article { display: block }
section { display: block }
aside { display: block }
header { display: block }
footer { display: block }
main { display: block }
nav { display: block }
figure { display: block }
figcaption { display: block }
h1 { display: block; font-size: 2em; font-weight: bold; margin: 0.67em 0 }
h2 { display: block; font-size: 1.5em; font-weight: bold; margin: 0.83em 0 }
h3 { display: block; font-size: 1.17em; font-weight: bold; margin: 1em 0 }
h4 { display: block; font-weight: bold; margin: 1.33em 0 }
h5 { display: block; font-size: 0.83em; font-weight: bold; margin: 1.67em 0 }
h6 { display: block; font-size: 0.67em; font-weight: bold; margin: 2.33em 0 }
blockquote { display: block; margin: 1em 40px }
ul { display: block; margin: 1em 0; padding-left: 40px; list-style-type: disc }
ol { display: block; margin: 1em 0; padding-left: 40px; list-style-type: decimal }
li { display: list-item }
pre { display: block; font-family: monospace; white-space: pre; margin: 1em 0 }
hr { display: block; border-bottom-width: 1px; border-bottom-color: gray; margin: 0.5em 0 }
b { font-weight: bold }
strong { font-weight: bold }
i { font-style: italic }
em { font-style: italic }
u { text-decoration-line: underline }
s { text-decoration-line: line-through }
span { display: inline }
a { display: inline; text-decoration-line: underline; color: #0000ee }
code { font-family: monospace }
`
