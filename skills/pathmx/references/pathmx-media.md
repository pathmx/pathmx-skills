# PathMX Media

<!-- TODO: draft. Ground truth: pathmx repo — packages/plugins/image/src/
     (directives + generation), plugins/core/spaceholders/. -->

Images, figures, media beats, and image directives.

## Plain markdown media

<!-- TODO: normal `![Alt](./x.png)` images, local paths tracked as build
     dependencies; figures and bare img/video/audio each become one media
     Beat in Play. -->

## Image presentation directives

<!-- TODO: layout-only directives (opt-in image plugin):
     `![@image.cover: Alt](./x.png)`, `![@image.background: cover](./x.png)`,
     `@image.wide`. Don't stack competing presentation stages on one image. -->

## Generated images

<!-- TODO: attach an @spaceholder HTML comment to a normal image
     (prompt, aspect ratio); see pathmx-directives.md for the directive and
     pipeline forms. Keep alt text human-readable; params live in the comment. -->

## Icons

<!-- TODO: opt-in Lucide plugin: `:lucide-file-input:` shortcodes, optional
     accessible label `:lucide-arrow-left[Back]:`; kebab-case names. -->
