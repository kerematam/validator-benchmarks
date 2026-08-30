# Development benchmark summary

> Non-public smoke/development output. Do not use these samples for performance claims.

- Run: `dev-diagnostic-10000-2026-08-30T19-17-55.618Z`
- Profile: `diagnostic-10000` (49149405 bytes)
- Validation envelope: `diagnostic` (maximum 10000 reports)
- Seed: `20260807`
- Fresh-process rounds per mode/variant: 10
- Command: `bun run benchmark --profile diagnostic-10000 --seed 20260807 --rounds 10 --mode validator`
- Bun: 1.3.14; Zod: 4.4.3 and 4.5.4; Hono: 4.12.11
- Execution environment: native-host
- Container limits: n/a
- Container whole-run memory peak: n/a
- Machine-idle assertion: not asserted
- Host load average before: 2.30, 2.00, 1.87
- Host load average after: 2.44, 2.13, 1.93

Quantiles use linear interpolation. P95 is omitted for groups with fewer than 20 samples.
Host activity is observational metadata, not proof that unrelated host work was absent.

## Primary duration

| Mode | Variant | Samples | Min (ms) | P25 (ms) | Median (ms) | P75 (ms) | Max (ms) | IQR (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| validator | zod-4.4-native-transform | 10 | 191.697 | 195.348 | 200.702 | 202.199 | 205.931 | 6.850 |
| validator | zod-4.4-separate-normalization | 10 | 133.870 | 135.850 | 137.789 | 139.347 | 146.635 | 3.497 |
| validator | zod-4.5-native-transform | 10 | 170.400 | 170.986 | 172.188 | 174.863 | 179.149 | 3.877 |
| validator | zod-4.5-separate-normalization | 10 | 120.546 | 121.328 | 122.622 | 125.170 | 128.637 | 3.842 |
| validator | zod-4.5-compiled-native-transform | 10 | 84.929 | 85.735 | 86.929 | 90.329 | 91.373 | 4.594 |
| validator | zod-4.5-compiled-separate-normalization | 10 | 79.793 | 80.346 | 81.569 | 83.836 | 85.762 | 3.490 |
| validator | zod-4.5-compiled-validate-separate-normalization | 10 | 79.590 | 80.154 | 80.259 | 83.878 | 88.185 | 3.724 |
| validator | ajv | 10 | 57.813 | 60.102 | 61.954 | 63.444 | 64.193 | 3.343 |
| validator | typebox | 10 | 76.701 | 78.713 | 79.539 | 80.450 | 84.436 | 1.738 |
| validator | typebox-native-transform | 10 | 2654.780 | 2671.863 | 2675.721 | 2691.717 | 2707.113 | 19.854 |
| validator | valibot | 10 | 133.344 | 135.575 | 136.154 | 137.504 | 138.257 | 1.929 |
| validator | valibot-native-transform | 10 | 164.578 | 166.488 | 166.931 | 168.549 | 172.112 | 2.061 |
| validator | none | 10 | 0.002 | 0.002 | 0.002 | 0.003 | 0.006 | 0.001 |

Validator mode measures validation and normalization from an already parsed value. HTTP mode measures a complete loopback request through Bun.serve and Hono, including server-side JSON decoding and response consumption.

## JSON.parse duration

This decode timer is recorded separately in validator-mode children and is excluded from the primary validator timer.

| Variant | Samples | Min (ms) | Median (ms) | Max (ms) |
| --- | ---: | ---: | ---: | ---: |
| zod-4.4-native-transform | 10 | 58.000 | 59.834 | 62.410 |
| zod-4.4-separate-normalization | 10 | 58.259 | 61.777 | 63.602 |
| zod-4.5-native-transform | 10 | 58.071 | 61.535 | 62.334 |
| zod-4.5-separate-normalization | 10 | 57.722 | 60.980 | 66.136 |
| zod-4.5-compiled-native-transform | 10 | 57.746 | 61.338 | 62.793 |
| zod-4.5-compiled-separate-normalization | 10 | 58.562 | 61.311 | 81.567 |
| zod-4.5-compiled-validate-separate-normalization | 10 | 57.579 | 61.121 | 62.596 |
| ajv | 10 | 58.379 | 60.784 | 73.405 |
| typebox | 10 | 56.683 | 61.861 | 63.855 |
| typebox-native-transform | 10 | 58.690 | 63.111 | 63.875 |
| valibot | 10 | 58.755 | 60.083 | 66.882 |
| valibot-native-transform | 10 | 59.127 | 60.078 | 61.763 |
| none | 10 | 59.041 | 60.511 | 69.789 |

## OS-observed peak RSS

The whole-child peak includes module setup, input decoding, validation, and result serialization. The measured-window high-water increase is the change in the process high-water mark between snapshots immediately before and after the primary timer; zero means the operation did not exceed an earlier process peak.

| Mode | Variant | Samples | Whole-child peak median (MiB) | Whole-child peak max (MiB) | Measured-window high-water increase median (MiB) |
| --- | --- | ---: | ---: | ---: | ---: |
| validator | zod-4.4-native-transform | 10 | 565.2 | 568.8 | 311.6 |
| validator | zod-4.4-separate-normalization | 10 | 618.6 | 624.6 | 364.0 |
| validator | zod-4.5-native-transform | 10 | 547.8 | 569.9 | 298.1 |
| validator | zod-4.5-separate-normalization | 10 | 563.9 | 566.9 | 314.4 |
| validator | zod-4.5-compiled-native-transform | 10 | 521.0 | 522.1 | 268.1 |
| validator | zod-4.5-compiled-separate-normalization | 10 | 483.0 | 484.6 | 233.0 |
| validator | zod-4.5-compiled-validate-separate-normalization | 10 | 483.6 | 484.9 | 232.6 |
| validator | ajv | 10 | 387.0 | 408.8 | 122.3 |
| validator | typebox | 10 | 428.9 | 431.5 | 161.8 |
| validator | typebox-native-transform | 10 | 721.6 | 829.8 | 447.2 |
| validator | valibot | 10 | 532.8 | 534.9 | 284.1 |
| validator | valibot-native-transform | 10 | 523.1 | 525.1 | 273.8 |
| validator | none | 10 | 248.4 | 249.0 | 0.0 |

## In-process RSS change

The before/after deltas keep the request text, parsed input, and validated result reachable. They show retained process and JavaScript-managed memory, not a sampled transient peak. Component deltas can still be negative when the runtime releases backing storage or changes allocator accounting.

| Mode | Variant | RSS before median (MiB) | RSS after median (MiB) | RSS delta median (MiB) | Heap used delta median (MiB) | Heap capacity delta median (MiB) | External delta median (MiB) | ArrayBuffer delta median (MiB) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| validator | zod-4.4-native-transform | 254.0 | 564.6 | 311.7 | 88.1 | 274.3 | 36.4 | 0.0 |
| validator | zod-4.4-separate-normalization | 253.6 | 617.8 | 364.0 | 38.5 | 305.0 | 1.3 | 0.0 |
| validator | zod-4.5-native-transform | 249.0 | 547.2 | 298.1 | 46.9 | 257.4 | 6.0 | 0.0 |
| validator | zod-4.5-separate-normalization | 248.3 | 563.1 | 314.4 | 41.0 | 258.3 | 0.5 | 0.0 |
| validator | zod-4.5-compiled-native-transform | 251.9 | 520.1 | 268.1 | 0.0 | 221.4 | 0.0 | 0.0 |
| validator | zod-4.5-compiled-separate-normalization | 249.6 | 482.0 | 233.0 | 0.0 | 194.2 | 0.0 | 0.0 |
| validator | zod-4.5-compiled-validate-separate-normalization | 250.0 | 482.6 | 232.6 | 0.0 | 194.2 | 0.0 | 0.0 |
| validator | ajv | 264.5 | 386.1 | 122.3 | 27.2 | 95.5 | 11.8 | 0.0 |
| validator | typebox | 265.6 | 427.8 | 161.8 | 0.0 | 130.6 | 0.0 | 0.0 |
| validator | typebox-native-transform | 274.2 | 721.1 | 447.2 | 67.9 | 343.6 | 12.6 | 0.0 |
| validator | valibot | 248.5 | 532.1 | 284.1 | 60.0 | 249.0 | -36.9 | -46.9 |
| validator | valibot-native-transform | 248.5 | 522.4 | 273.8 | 47.7 | 242.6 | -37.3 | -46.9 |
| validator | none | 247.2 | 247.2 | 0.0 | 0.0 | 0.0 | 0.3 | 0.0 |

## Measured-window OS resource deltas

CPU and kernel counters are snapshots around the same primary interval as the duration timer. CPU time is summed across process threads and can therefore exceed wall time.

| Mode | Variant | User CPU median (ms) | System CPU median (ms) | Minor faults median | Major faults median | Voluntary switches median | Involuntary switches median | FS reads median | FS writes median |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| validator | zod-4.4-native-transform | 359.217 | 31.158 | 19945 | 2 | 0 | 415 | 0 | 0 |
| validator | zod-4.4-separate-normalization | 335.459 | 30.107 | 23295 | 2 | 0 | 271 | 0 | 0 |
| validator | zod-4.5-native-transform | 298.279 | 28.836 | 19079 | 1 | 0 | 332 | 0 | 0 |
| validator | zod-4.5-separate-normalization | 299.351 | 26.341 | 20124 | 2 | 0 | 260 | 0 | 0 |
| validator | zod-4.5-compiled-native-transform | 199.321 | 21.527 | 17163 | 1 | 0 | 152 | 0 | 0 |
| validator | zod-4.5-compiled-separate-normalization | 171.944 | 18.679 | 14909 | 1 | 0 | 133 | 0 | 0 |
| validator | zod-4.5-compiled-validate-separate-normalization | 171.185 | 18.654 | 14888 | 1 | 0 | 135 | 0 | 0 |
| validator | ajv | 150.192 | 11.246 | 7827 | 0 | 0 | 116 | 0 | 0 |
| validator | typebox | 169.678 | 14.095 | 10352 | 1 | 0 | 110 | 0 | 0 |
| validator | typebox-native-transform | 3347.124 | 156.863 | 28621 | 1 | 0 | 1826 | 0 | 0 |
| validator | valibot | 263.899 | 24.767 | 18181 | 2 | 0 | 287 | 0 | 0 |
| validator | valibot-native-transform | 236.305 | 24.711 | 17519 | 2 | 0 | 266 | 0 | 0 |
| validator | none | 0.016 | 0.003 | 0 | 0 | 0 | 0 | 0 | 0 |

## Individual samples

| Round | Order | PID | Mode | Variant | Primary (ms) | JSON.parse (ms) | Peak RSS (MiB) | Window RSS HWM increase (MiB) | User CPU (ms) | System CPU (ms) |
| ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 59081 | validator | zod-4.4-native-transform | 194.753 | 62.410 | 542.7 | 289.5 | 312.745 | 28.764 |
| 1 | 2 | 59083 | validator | zod-4.4-separate-normalization | 139.445 | 59.411 | 530.0 | 276.3 | 381.794 | 26.171 |
| 1 | 3 | 59104 | validator | zod-4.5-native-transform | 175.396 | 61.290 | 548.3 | 298.4 | 309.163 | 28.674 |
| 1 | 4 | 59106 | validator | zod-4.5-separate-normalization | 121.302 | 60.449 | 561.2 | 311.8 | 288.174 | 26.336 |
| 1 | 5 | 59115 | validator | zod-4.5-compiled-native-transform | 90.963 | 60.232 | 434.3 | 182.4 | 280.862 | 18.267 |
| 1 | 6 | 59135 | validator | zod-4.5-compiled-separate-normalization | 80.927 | 61.224 | 484.6 | 233.1 | 171.535 | 19.264 |
| 1 | 7 | 59137 | validator | zod-4.5-compiled-validate-separate-normalization | 80.093 | 62.361 | 484.1 | 232.9 | 171.170 | 18.758 |
| 1 | 8 | 59139 | validator | ajv | 60.175 | 63.732 | 407.9 | 142.8 | 137.704 | 12.340 |
| 1 | 9 | 59141 | validator | typebox | 78.862 | 56.683 | 371.2 | 105.6 | 190.388 | 8.819 |
| 1 | 10 | 59161 | validator | typebox-native-transform | 2682.382 | 63.011 | 720.3 | 445.8 | 3338.091 | 156.913 |
| 1 | 11 | 59217 | validator | valibot | 135.951 | 61.822 | 533.5 | 284.9 | 261.848 | 25.192 |
| 1 | 12 | 59239 | validator | valibot-native-transform | 166.545 | 60.780 | 523.0 | 273.7 | 226.713 | 25.601 |
| 1 | 13 | 59241 | validator | none | 0.002 | 68.347 | 248.7 | 0.0 | 0.014 | 0.002 |
| 2 | 1 | 59243 | validator | zod-4.4-separate-normalization | 133.870 | 62.126 | 623.9 | 368.0 | 327.553 | 29.336 |
| 2 | 2 | 59263 | validator | zod-4.5-native-transform | 179.149 | 58.071 | 569.6 | 322.3 | 354.251 | 31.261 |
| 2 | 3 | 59265 | validator | zod-4.5-separate-normalization | 126.962 | 57.722 | 501.5 | 252.8 | 360.353 | 24.639 |
| 2 | 4 | 59269 | validator | zod-4.5-compiled-native-transform | 86.606 | 61.187 | 521.0 | 268.2 | 198.608 | 22.267 |
| 2 | 5 | 59289 | validator | zod-4.5-compiled-separate-normalization | 80.528 | 63.067 | 482.5 | 233.2 | 170.896 | 18.630 |
| 2 | 6 | 59291 | validator | zod-4.5-compiled-validate-separate-normalization | 80.276 | 62.200 | 484.9 | 233.2 | 171.201 | 18.516 |
| 2 | 7 | 59293 | validator | ajv | 60.077 | 62.263 | 407.7 | 142.8 | 137.955 | 12.439 |
| 2 | 8 | 59295 | validator | typebox | 76.701 | 63.009 | 428.8 | 161.8 | 159.779 | 14.226 |
| 2 | 9 | 59315 | validator | typebox-native-transform | 2677.438 | 63.875 | 720.9 | 446.5 | 3341.679 | 156.812 |
| 2 | 10 | 59374 | validator | valibot | 135.566 | 61.318 | 534.9 | 285.3 | 265.012 | 23.218 |
| 2 | 11 | 59394 | validator | valibot-native-transform | 170.283 | 59.609 | 410.3 | 162.3 | 283.470 | 20.526 |
| 2 | 12 | 59396 | validator | none | 0.002 | 60.883 | 248.3 | 0.0 | 0.015 | 0.005 |
| 2 | 13 | 59398 | validator | zod-4.4-native-transform | 197.134 | 59.766 | 566.1 | 311.9 | 360.255 | 30.057 |
| 3 | 1 | 59418 | validator | zod-4.5-native-transform | 170.400 | 61.041 | 544.3 | 297.0 | 294.733 | 27.660 |
| 3 | 2 | 59420 | validator | zod-4.5-separate-normalization | 120.546 | 62.797 | 566.1 | 316.4 | 296.878 | 26.346 |
| 3 | 3 | 59422 | validator | zod-4.5-compiled-native-transform | 90.622 | 57.746 | 434.5 | 183.7 | 282.602 | 18.807 |
| 3 | 4 | 59442 | validator | zod-4.5-compiled-separate-normalization | 84.345 | 58.562 | 468.8 | 218.5 | 212.192 | 18.690 |
| 3 | 5 | 59444 | validator | zod-4.5-compiled-validate-separate-normalization | 80.138 | 62.153 | 483.6 | 232.8 | 165.177 | 18.549 |
| 3 | 6 | 59446 | validator | ajv | 60.651 | 62.594 | 408.8 | 142.3 | 138.840 | 12.070 |
| 3 | 7 | 59448 | validator | typebox | 81.899 | 60.183 | 370.6 | 105.2 | 198.812 | 12.037 |
| 3 | 8 | 59468 | validator | typebox-native-transform | 2707.113 | 63.406 | 829.8 | 553.8 | 3423.481 | 167.732 |
| 3 | 9 | 59525 | validator | valibot | 136.914 | 60.049 | 531.4 | 282.0 | 261.267 | 24.944 |
| 3 | 10 | 59549 | validator | valibot-native-transform | 166.850 | 60.523 | 524.0 | 274.6 | 236.268 | 24.520 |
| 3 | 11 | 59551 | validator | none | 0.006 | 59.041 | 247.6 | 0.0 | 0.015 | 0.002 |
| 3 | 12 | 59553 | validator | zod-4.4-native-transform | 193.077 | 61.406 | 545.0 | 289.4 | 307.760 | 28.253 |
| 3 | 13 | 59573 | validator | zod-4.4-separate-normalization | 136.649 | 63.602 | 618.5 | 363.0 | 333.300 | 27.955 |
| 4 | 1 | 59579 | validator | zod-4.5-separate-normalization | 122.545 | 62.801 | 563.9 | 315.5 | 306.138 | 26.813 |
| 4 | 2 | 59581 | validator | zod-4.5-compiled-native-transform | 85.634 | 61.490 | 521.5 | 268.1 | 198.094 | 22.099 |
| 4 | 3 | 59601 | validator | zod-4.5-compiled-separate-normalization | 82.211 | 62.273 | 484.0 | 233.1 | 172.304 | 19.135 |
| 4 | 4 | 59603 | validator | zod-4.5-compiled-validate-separate-normalization | 83.932 | 58.180 | 469.2 | 219.4 | 217.495 | 18.296 |
| 4 | 5 | 59605 | validator | ajv | 63.454 | 58.523 | 366.2 | 99.5 | 169.062 | 9.940 |
| 4 | 6 | 59625 | validator | typebox | 78.439 | 63.855 | 429.6 | 161.7 | 160.954 | 13.965 |
| 4 | 7 | 59627 | validator | typebox-native-transform | 2671.842 | 62.134 | 723.1 | 447.7 | 3325.189 | 156.432 |
| 4 | 8 | 59684 | validator | valibot | 137.700 | 66.882 | 534.7 | 285.0 | 263.296 | 25.026 |
| 4 | 9 | 59706 | validator | valibot-native-transform | 167.012 | 59.716 | 525.1 | 275.9 | 236.342 | 25.262 |
| 4 | 10 | 59708 | validator | none | 0.003 | 59.937 | 248.6 | 0.0 | 0.014 | 0.004 |
| 4 | 11 | 59710 | validator | zod-4.4-native-transform | 202.061 | 58.050 | 564.5 | 311.7 | 358.746 | 32.299 |
| 4 | 12 | 59731 | validator | zod-4.4-separate-normalization | 135.450 | 61.429 | 616.9 | 362.4 | 320.838 | 30.556 |
| 4 | 13 | 59733 | validator | zod-4.5-native-transform | 173.265 | 62.127 | 547.5 | 297.4 | 301.504 | 29.033 |
| 5 | 1 | 59755 | validator | zod-4.5-compiled-native-transform | 87.253 | 62.190 | 521.3 | 268.3 | 199.891 | 22.639 |
| 5 | 2 | 59757 | validator | zod-4.5-compiled-separate-normalization | 79.793 | 60.808 | 483.7 | 232.9 | 163.541 | 18.668 |
| 5 | 3 | 59759 | validator | zod-4.5-compiled-validate-separate-normalization | 83.715 | 58.807 | 469.4 | 218.3 | 214.970 | 18.948 |
| 5 | 4 | 59761 | validator | ajv | 63.413 | 59.305 | 366.6 | 100.4 | 161.545 | 10.689 |
| 5 | 5 | 59781 | validator | typebox | 79.998 | 59.250 | 370.8 | 105.5 | 190.700 | 12.088 |
| 5 | 6 | 59783 | validator | typebox-native-transform | 2654.780 | 63.307 | 721.6 | 446.9 | 3321.036 | 150.978 |
| 5 | 7 | 59844 | validator | valibot | 133.393 | 58.755 | 426.3 | 177.1 | 303.437 | 18.887 |
| 5 | 8 | 59866 | validator | valibot-native-transform | 166.233 | 59.944 | 521.1 | 272.0 | 226.521 | 24.779 |
| 5 | 9 | 59868 | validator | none | 0.002 | 69.789 | 247.8 | 0.0 | 0.017 | 0.002 |
| 5 | 10 | 59870 | validator | zod-4.4-native-transform | 199.752 | 58.114 | 565.8 | 311.6 | 358.280 | 31.153 |
| 5 | 11 | 59890 | validator | zod-4.4-separate-normalization | 146.635 | 63.179 | 618.3 | 364.0 | 343.618 | 35.013 |
| 5 | 12 | 59892 | validator | zod-4.5-native-transform | 171.085 | 61.780 | 545.9 | 297.1 | 294.434 | 28.969 |
| 5 | 13 | 59912 | validator | zod-4.5-separate-normalization | 122.699 | 63.702 | 565.9 | 316.4 | 296.077 | 28.168 |
| 6 | 1 | 59914 | validator | zod-4.5-compiled-separate-normalization | 80.126 | 61.399 | 483.2 | 233.0 | 171.284 | 18.281 |
| 6 | 2 | 59916 | validator | zod-4.5-compiled-validate-separate-normalization | 79.590 | 62.596 | 483.9 | 232.6 | 170.586 | 17.629 |
| 6 | 3 | 59918 | validator | ajv | 59.580 | 73.405 | 406.6 | 142.6 | 137.347 | 12.210 |
| 6 | 4 | 59939 | validator | typebox | 80.299 | 62.092 | 430.1 | 162.5 | 169.765 | 14.385 |
| 6 | 5 | 59941 | validator | typebox-native-transform | 2663.028 | 58.690 | 820.5 | 545.7 | 3389.221 | 156.676 |
| 6 | 6 | 60015 | validator | valibot | 138.257 | 60.104 | 532.5 | 284.4 | 262.203 | 24.810 |
| 6 | 7 | 60019 | validator | valibot-native-transform | 164.578 | 60.211 | 408.1 | 159.1 | 277.770 | 19.301 |
| 6 | 8 | 60021 | validator | none | 0.003 | 59.528 | 249.0 | 0.0 | 0.022 | 0.003 |
| 6 | 9 | 60023 | validator | zod-4.4-native-transform | 202.245 | 58.000 | 568.8 | 313.7 | 363.482 | 31.163 |
| 6 | 10 | 60043 | validator | zod-4.4-separate-normalization | 139.157 | 58.259 | 529.2 | 275.6 | 375.027 | 26.427 |
| 6 | 11 | 60045 | validator | zod-4.5-native-transform | 177.109 | 59.177 | 569.9 | 320.4 | 348.335 | 30.830 |
| 6 | 12 | 60065 | validator | zod-4.5-separate-normalization | 121.404 | 61.511 | 565.1 | 316.2 | 294.354 | 27.108 |
| 6 | 13 | 60067 | validator | zod-4.5-compiled-native-transform | 86.038 | 62.793 | 522.1 | 269.2 | 198.752 | 21.732 |
| 7 | 1 | 60069 | validator | zod-4.5-compiled-validate-separate-normalization | 80.203 | 61.009 | 483.6 | 233.3 | 170.868 | 18.956 |
| 7 | 2 | 60089 | validator | ajv | 64.193 | 58.996 | 366.3 | 100.8 | 169.240 | 10.807 |
| 7 | 3 | 60091 | validator | typebox | 84.436 | 58.601 | 374.7 | 104.9 | 191.921 | 12.100 |
| 7 | 4 | 60095 | validator | typebox-native-transform | 2671.925 | 63.211 | 721.6 | 447.0 | 3352.569 | 139.023 |
| 7 | 5 | 60174 | validator | valibot | 135.602 | 60.062 | 532.0 | 283.9 | 260.217 | 24.723 |
| 7 | 6 | 60176 | validator | valibot-native-transform | 168.865 | 59.127 | 523.7 | 274.5 | 238.581 | 24.758 |
| 7 | 7 | 60178 | validator | none | 0.003 | 61.478 | 247.3 | 0.0 | 0.018 | 0.002 |
| 7 | 8 | 60198 | validator | zod-4.4-native-transform | 205.931 | 59.332 | 568.4 | 312.7 | 373.458 | 31.830 |
| 7 | 9 | 60200 | validator | zod-4.4-separate-normalization | 135.725 | 63.007 | 618.7 | 363.9 | 322.282 | 30.319 |
| 7 | 10 | 60202 | validator | zod-4.5-native-transform | 171.361 | 62.177 | 547.7 | 297.5 | 295.291 | 28.743 |
| 7 | 11 | 60223 | validator | zod-4.5-separate-normalization | 128.637 | 58.205 | 502.3 | 253.2 | 364.717 | 25.579 |
| 7 | 12 | 60225 | validator | zod-4.5-compiled-native-transform | 85.595 | 61.839 | 521.5 | 268.6 | 198.355 | 21.687 |
| 7 | 13 | 60227 | validator | zod-4.5-compiled-separate-normalization | 84.980 | 60.942 | 469.1 | 218.0 | 211.123 | 18.122 |
| 8 | 1 | 60247 | validator | ajv | 63.556 | 58.379 | 365.7 | 100.3 | 167.983 | 10.345 |
| 8 | 2 | 60249 | validator | typebox | 78.663 | 61.630 | 429.3 | 162.8 | 168.509 | 14.687 |
| 8 | 3 | 60251 | validator | typebox-native-transform | 2694.829 | 63.659 | 721.1 | 444.9 | 3357.318 | 160.010 |
| 8 | 4 | 60326 | validator | valibot | 133.344 | 58.829 | 424.0 | 176.7 | 303.021 | 19.478 |
| 8 | 5 | 60330 | validator | valibot-native-transform | 166.469 | 61.763 | 523.9 | 274.4 | 230.577 | 25.328 |
| 8 | 6 | 60353 | validator | none | 0.002 | 60.531 | 247.3 | 0.0 | 0.017 | 0.002 |
| 8 | 7 | 60355 | validator | zod-4.4-native-transform | 191.697 | 62.145 | 543.8 | 287.3 | 300.902 | 29.145 |
| 8 | 8 | 60357 | validator | zod-4.4-separate-normalization | 136.224 | 60.906 | 624.6 | 370.1 | 339.343 | 29.894 |
| 8 | 9 | 60380 | validator | zod-4.5-native-transform | 170.953 | 61.911 | 547.8 | 297.9 | 300.099 | 28.420 |
| 8 | 10 | 60382 | validator | zod-4.5-separate-normalization | 125.526 | 59.402 | 499.9 | 251.4 | 353.411 | 24.967 |
| 8 | 11 | 60384 | validator | zod-4.5-compiled-native-transform | 89.451 | 58.525 | 437.3 | 184.6 | 275.241 | 18.452 |
| 8 | 12 | 60404 | validator | zod-4.5-compiled-separate-normalization | 82.310 | 62.120 | 482.8 | 232.8 | 173.824 | 18.985 |
| 8 | 13 | 60409 | validator | zod-4.5-compiled-validate-separate-normalization | 88.185 | 59.602 | 469.9 | 219.5 | 225.398 | 19.952 |
| 9 | 1 | 60411 | validator | typebox | 80.501 | 62.170 | 431.5 | 162.4 | 169.591 | 14.783 |
| 9 | 2 | 60413 | validator | typebox-native-transform | 2701.305 | 58.845 | 827.6 | 552.9 | 3399.174 | 160.515 |
| 9 | 3 | 60488 | validator | valibot | 136.358 | 59.149 | 533.1 | 283.8 | 264.503 | 24.680 |
| 9 | 4 | 60492 | validator | valibot-native-transform | 172.112 | 59.602 | 522.6 | 272.6 | 224.197 | 24.370 |
| 9 | 5 | 60512 | validator | none | 0.002 | 60.491 | 248.5 | 0.0 | 0.016 | 0.003 |
| 9 | 6 | 60514 | validator | zod-4.4-native-transform | 201.651 | 60.269 | 567.1 | 312.3 | 359.689 | 32.237 |
| 9 | 7 | 60516 | validator | zod-4.4-separate-normalization | 139.410 | 61.189 | 621.3 | 366.7 | 334.798 | 31.007 |
| 9 | 8 | 60536 | validator | zod-4.5-native-transform | 170.696 | 62.334 | 549.3 | 299.0 | 294.180 | 28.929 |
| 9 | 9 | 60538 | validator | zod-4.5-separate-normalization | 124.100 | 60.391 | 566.9 | 317.6 | 301.823 | 28.959 |
| 9 | 10 | 60540 | validator | zod-4.5-compiled-native-transform | 84.929 | 62.238 | 521.1 | 268.4 | 194.465 | 21.368 |
| 9 | 11 | 60560 | validator | zod-4.5-compiled-separate-normalization | 85.762 | 81.567 | 469.3 | 218.7 | 220.028 | 19.222 |
| 9 | 12 | 60562 | validator | zod-4.5-compiled-validate-separate-normalization | 84.841 | 57.579 | 470.4 | 220.3 | 221.257 | 18.547 |
| 9 | 13 | 60564 | validator | ajv | 63.258 | 58.506 | 367.4 | 102.3 | 169.462 | 10.907 |
| 10 | 1 | 60584 | validator | typebox-native-transform | 2674.004 | 62.991 | 721.0 | 447.4 | 3335.968 | 157.245 |
| 10 | 2 | 60640 | validator | valibot | 137.953 | 60.285 | 534.1 | 284.3 | 265.061 | 25.195 |
| 10 | 3 | 60662 | validator | valibot-native-transform | 167.599 | 60.731 | 523.3 | 273.8 | 239.280 | 24.664 |
| 10 | 4 | 60664 | validator | none | 0.002 | 60.193 | 248.7 | 0.0 | 0.016 | 0.006 |
| 10 | 5 | 60666 | validator | zod-4.4-native-transform | 204.403 | 59.903 | 564.2 | 311.0 | 362.258 | 31.283 |
| 10 | 6 | 60689 | validator | zod-4.4-separate-normalization | 138.928 | 62.167 | 622.3 | 368.0 | 336.119 | 31.142 |
| 10 | 7 | 60691 | validator | zod-4.5-native-transform | 173.014 | 61.030 | 547.8 | 298.6 | 296.460 | 27.320 |
| 10 | 8 | 60693 | validator | zod-4.5-separate-normalization | 121.228 | 66.136 | 563.9 | 313.4 | 289.151 | 25.856 |
| 10 | 9 | 60713 | validator | zod-4.5-compiled-native-transform | 91.373 | 58.245 | 438.2 | 185.2 | 279.328 | 18.960 |
| 10 | 10 | 60715 | validator | zod-4.5-compiled-separate-normalization | 80.286 | 61.200 | 484.3 | 233.3 | 171.583 | 18.104 |
| 10 | 11 | 60717 | validator | zod-4.5-compiled-validate-separate-normalization | 80.242 | 61.233 | 484.1 | 232.6 | 171.082 | 18.907 |
| 10 | 12 | 60719 | validator | ajv | 57.813 | 62.763 | 407.3 | 143.4 | 136.611 | 11.586 |
| 10 | 13 | 60739 | validator | typebox | 79.081 | 62.097 | 429.1 | 162.5 | 168.370 | 14.409 |
