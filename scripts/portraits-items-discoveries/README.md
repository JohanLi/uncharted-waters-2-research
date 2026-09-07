Portraits, items and discoveries are extracted from the KAO folder. The algorithm is described in detail here: https://sites.google.com/site/drrkdriller/uncharted-waters-2/kao-lzw

For player and NPC sprites when walking around port, the process is different:

* A character sprite is 32x32, and drawn in four 16x16 blocks.
* Each block contains 1280 bits, where 5 bits are used to describe each pixel. Match four of those bits
  (bits 0, 256, 512, 768, and 1024 for the first pixel) to a color. The last bit (1280 for the first pixel), if set to 1,
  means that the pixel is transparent.
