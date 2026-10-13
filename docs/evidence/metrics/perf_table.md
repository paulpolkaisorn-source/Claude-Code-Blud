(CPU milliseconds on Mesa llvmpipe, 4 cores, 3840x2304 - relative cost only, NOT GPU time)

| pass | Balanced | Ultra | Reality |
|---|---|---|---|
| Prep | 49 | 52 | 55 |
| Stats | 0 | 1 | 0 |
| StatsCopy | 0 | 0 | 0 |
| SmallCopy | 0 | 0 | 0 |
| DepthQ | 24 | 22 | 22 |
| DepthQCopy | 2 | 1 | 2 |
| DepthSnap | 17 | 29 | 23 |
| Geometry | 142 | 154 | 141 |
| SSR | 88 | 152 | 109 |
| SSRResolve | 63 | 65 | 47 |
| SSRCopy | 9 | 8 | 8 |
| Down2 | 3 | 2 | 2 |
| Down3 | 1 | 1 | 1 |
| Down4 | 0 | 0 | 0 |
| Down5 | 0 | 0 | 0 |
| Down6 | 0 | 0 | 0 |
| Up5 | 0 | 0 | 0 |
| Up4 | 0 | 1 | 0 |
| Up3 | 1 | 1 | 1 |
| Up2 | 3 | 3 | 3 |
| Up1 | 10 | 9 | 10 |
| Composite | 582 | 565 | 535 |
| **TOTAL** | **996** | **1066** | **960** |
