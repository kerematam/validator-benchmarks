# Development benchmark summary

> Non-public smoke/development output. Do not use these samples for performance claims.

- Run: `dev-diagnostic-10000-2026-08-30T15-35-58.467Z`
- Profile: `diagnostic-10000` (49149405 bytes)
- Validation envelope: `diagnostic` (maximum 10000 reports)
- Seed: `20260807`
- Fresh-process rounds per mode/variant: 10
- Command: `bun run benchmark --profile diagnostic-10000 --seed 20260807 --rounds 10 --mode both`
- Bun: 1.3.14; Hono: 4.12.11
- Execution environment: native-host
- Container limits: n/a
- Container whole-run memory peak: n/a
- Machine-idle assertion: not asserted
- Host load average before: 1.51, 1.38, 1.45
- Host load average after: 2.64, 1.86, 1.62

Quantiles use linear interpolation. P95 is omitted for groups with fewer than 20 samples.
Host activity is observational metadata, not proof that unrelated host work was absent.

## Primary duration

| Mode | Variant | Samples | Min (ms) | P25 (ms) | Median (ms) | P75 (ms) | Max (ms) | IQR (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| validator | current-zod | 10 | 165.550 | 165.931 | 167.233 | 171.809 | 175.409 | 5.878 |
| validator | native-compiled-zod | 10 | 80.901 | 82.177 | 82.376 | 87.149 | 87.939 | 4.972 |
| validator | compiled-zod | 10 | 114.961 | 116.147 | 116.932 | 117.398 | 120.682 | 1.251 |
| validator | zod-manual-normalizer | 10 | 117.091 | 117.814 | 118.210 | 119.508 | 120.597 | 1.694 |
| validator | compiled-zod-manual-normalizer | 10 | 62.596 | 63.517 | 64.173 | 65.416 | 66.863 | 1.900 |
| validator | ajv | 10 | 57.825 | 58.059 | 58.308 | 58.816 | 61.262 | 0.757 |
| validator | typebox | 10 | 75.295 | 75.860 | 77.100 | 77.967 | 85.825 | 2.107 |
| validator | typebox-native-transform | 10 | 2613.846 | 2637.706 | 2654.759 | 2658.565 | 2679.910 | 20.859 |
| validator | valibot | 10 | 130.403 | 132.381 | 133.056 | 133.338 | 133.464 | 0.957 |
| validator | valibot-native-transform | 10 | 156.603 | 158.136 | 160.522 | 162.802 | 164.085 | 4.665 |
| validator | none | 10 | 0.001 | 0.002 | 0.002 | 0.002 | 0.006 | 0.001 |
| http | native-compiled-zod | 10 | 194.083 | 195.605 | 198.237 | 199.717 | 206.759 | 4.112 |
| http | compiled-zod | 10 | 224.420 | 226.708 | 227.465 | 228.505 | 231.195 | 1.797 |
| http | zod-manual-normalizer | 10 | 230.742 | 231.268 | 233.047 | 234.857 | 237.459 | 3.589 |
| http | compiled-zod-manual-normalizer | 10 | 174.697 | 176.228 | 177.011 | 177.982 | 180.430 | 1.754 |
| http | ajv | 10 | 168.121 | 169.330 | 170.029 | 170.953 | 172.439 | 1.624 |
| http | typebox | 10 | 184.033 | 185.423 | 186.039 | 188.783 | 195.370 | 3.360 |
| http | typebox-native-transform | 10 | 2740.307 | 2769.575 | 2791.865 | 2801.111 | 2811.938 | 31.536 |
| http | valibot | 10 | 236.993 | 240.656 | 240.871 | 241.921 | 244.330 | 1.265 |
| http | valibot-native-transform | 10 | 264.167 | 265.897 | 268.607 | 270.241 | 271.057 | 4.344 |
| http | none | 10 | 107.085 | 108.827 | 109.332 | 109.920 | 111.795 | 1.093 |
| http | current-zod | 10 | 277.797 | 281.282 | 283.983 | 285.512 | 287.774 | 4.230 |

Validator mode measures validation and normalization from an already parsed value. HTTP mode measures a complete loopback request through Bun.serve and Hono, including server-side JSON decoding and response consumption.

## JSON.parse duration

This decode timer is recorded separately in validator-mode children and is excluded from the primary validator timer.

| Variant | Samples | Min (ms) | Median (ms) | Max (ms) |
| --- | ---: | ---: | ---: | ---: |
| current-zod | 10 | 56.987 | 60.762 | 62.010 |
| native-compiled-zod | 10 | 56.926 | 59.924 | 61.858 |
| compiled-zod | 10 | 57.580 | 60.679 | 63.501 |
| zod-manual-normalizer | 10 | 58.226 | 60.222 | 60.837 |
| compiled-zod-manual-normalizer | 10 | 57.005 | 59.858 | 60.908 |
| ajv | 10 | 60.245 | 61.892 | 63.121 |
| typebox | 10 | 56.444 | 61.295 | 71.380 |
| typebox-native-transform | 10 | 60.428 | 61.108 | 62.323 |
| valibot | 10 | 58.166 | 58.974 | 59.421 |
| valibot-native-transform | 10 | 56.802 | 58.697 | 60.872 |
| none | 10 | 58.068 | 58.928 | 61.018 |

## OS-observed peak RSS

The whole-child peak includes module setup, input decoding, validation, and result serialization. The measured-window high-water increase is the change in the process high-water mark between snapshots immediately before and after the primary timer; zero means the operation did not exceed an earlier process peak.

| Mode | Variant | Samples | Whole-child peak median (MiB) | Whole-child peak max (MiB) | Measured-window high-water increase median (MiB) |
| --- | --- | ---: | ---: | ---: | ---: |
| validator | current-zod | 10 | 546.6 | 569.8 | 297.9 |
| validator | native-compiled-zod | 10 | 520.4 | 521.5 | 268.4 |
| validator | compiled-zod | 10 | 530.6 | 532.8 | 281.1 |
| validator | zod-manual-normalizer | 10 | 567.8 | 570.0 | 318.7 |
| validator | compiled-zod-manual-normalizer | 10 | 417.2 | 418.4 | 167.9 |
| validator | ajv | 10 | 407.7 | 408.7 | 142.8 |
| validator | typebox | 10 | 429.8 | 432.1 | 162.1 |
| validator | typebox-native-transform | 10 | 721.0 | 828.0 | 446.4 |
| validator | valibot | 10 | 533.0 | 534.5 | 283.7 |
| validator | valibot-native-transform | 10 | 522.9 | 524.2 | 273.2 |
| validator | none | 10 | 248.2 | 248.7 | 0.0 |
| http | native-compiled-zod | 10 | 516.0 | 555.8 | 347.4 |
| http | compiled-zod | 10 | 496.0 | 524.8 | 330.0 |
| http | zod-manual-normalizer | 10 | 617.4 | 644.0 | 452.6 |
| http | compiled-zod-manual-normalizer | 10 | 490.1 | 514.7 | 323.7 |
| http | ajv | 10 | 445.7 | 468.3 | 263.8 |
| http | typebox | 10 | 464.1 | 498.0 | 279.9 |
| http | typebox-native-transform | 10 | 965.1 | 998.0 | 773.2 |
| http | valibot | 10 | 519.8 | 534.0 | 354.5 |
| http | valibot-native-transform | 10 | 502.4 | 516.0 | 337.3 |
| http | none | 10 | 333.3 | 355.8 | 168.8 |
| http | current-zod | 10 | 695.6 | 722.7 | 529.9 |

## In-process RSS change

The before/after deltas keep the request text, parsed input, and validated result reachable. They show retained process and JavaScript-managed memory, not a sampled transient peak. Component deltas can still be negative when the runtime releases backing storage or changes allocator accounting.

| Mode | Variant | RSS before median (MiB) | RSS after median (MiB) | RSS delta median (MiB) | Heap used delta median (MiB) | Heap capacity delta median (MiB) | External delta median (MiB) | ArrayBuffer delta median (MiB) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| validator | current-zod | 248.1 | 546.0 | 297.9 | 46.9 | 257.1 | 6.4 | 0.0 |
| validator | native-compiled-zod | 251.4 | 519.5 | 268.4 | 0.0 | 221.5 | 0.0 | 0.0 |
| validator | compiled-zod | 248.4 | 529.3 | 281.1 | 0.0 | 243.3 | 5.1 | 0.0 |
| validator | zod-manual-normalizer | 248.0 | 567.0 | 318.7 | 40.9 | 259.4 | 0.4 | 0.0 |
| validator | compiled-zod-manual-normalizer | 248.3 | 416.0 | 167.9 | 0.0 | 130.2 | 0.0 | 0.0 |
| validator | ajv | 264.1 | 406.7 | 142.8 | 0.0 | 115.3 | 0.0 | 0.0 |
| validator | typebox | 266.4 | 428.5 | 162.1 | 0.0 | 130.5 | 0.0 | 0.0 |
| validator | typebox-native-transform | 273.9 | 720.6 | 446.4 | 68.0 | 343.5 | 12.5 | 0.0 |
| validator | valibot | 248.6 | 532.2 | 283.7 | 59.8 | 248.8 | -38.9 | -46.9 |
| validator | valibot-native-transform | 248.2 | 522.1 | 273.2 | 47.8 | 241.7 | 5.6 | 0.0 |
| validator | none | 247.2 | 247.2 | 0.0 | 0.0 | 0.0 | 0.3 | 0.0 |
| http | native-compiled-zod | 168.2 | 515.3 | 347.4 | 115.7 | 168.9 | 57.5 | 0.0 |
| http | compiled-zod | 164.9 | 495.1 | 330.0 | 69.5 | 162.5 | 57.2 | 0.0 |
| http | zod-manual-normalizer | 164.3 | 616.4 | 452.6 | 68.4 | 256.0 | 55.7 | 0.0 |
| http | compiled-zod-manual-normalizer | 164.5 | 488.8 | 323.7 | 109.6 | 154.8 | -23.2 | 0.0 |
| http | ajv | 181.7 | 445.1 | 263.8 | 98.8 | 106.6 | -24.2 | 0.0 |
| http | typebox | 182.5 | 463.1 | 279.9 | 103.7 | 109.7 | -45.9 | 0.0 |
| http | typebox-native-transform | 191.8 | 964.8 | 773.3 | 141.3 | 494.2 | 63.7 | 0.0 |
| http | valibot | 164.8 | 519.1 | 354.5 | 75.9 | 179.7 | 54.4 | 0.0 |
| http | valibot-native-transform | 164.2 | 501.7 | 337.3 | 72.8 | 164.7 | 56.6 | 0.0 |
| http | none | 163.6 | 332.2 | 168.8 | -46.5 | 35.2 | 2.4 | 0.0 |
| http | current-zod | 165.1 | 695.0 | 529.9 | 70.9 | 357.1 | 60.3 | 0.0 |

## Measured-window OS resource deltas

CPU and kernel counters are snapshots around the same primary interval as the duration timer. CPU time is summed across process threads and can therefore exceed wall time.

| Mode | Variant | User CPU median (ms) | System CPU median (ms) | Minor faults median | Major faults median | Voluntary switches median | Involuntary switches median | FS reads median | FS writes median |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| validator | current-zod | 297.981 | 25.285 | 19064 | 1 | 0 | 289 | 0 | 0 |
| validator | native-compiled-zod | 195.919 | 18.585 | 17182 | 1 | 0 | 115 | 0 | 0 |
| validator | compiled-zod | 212.612 | 20.662 | 17994 | 1 | 0 | 105 | 0 | 0 |
| validator | zod-manual-normalizer | 294.851 | 23.966 | 20398 | 2 | 0 | 203 | 0 | 0 |
| validator | compiled-zod-manual-normalizer | 140.471 | 12.073 | 10744 | 1 | 0 | 107 | 0 | 0 |
| validator | ajv | 136.151 | 10.601 | 9137 | 0 | 0 | 59 | 0 | 0 |
| validator | typebox | 165.992 | 12.539 | 10375 | 1 | 0 | 78 | 0 | 0 |
| validator | typebox-native-transform | 3331.604 | 130.970 | 28569 | 1 | 0 | 1723 | 0 | 0 |
| validator | valibot | 258.097 | 21.753 | 18155 | 2 | 0 | 235 | 0 | 0 |
| validator | valibot-native-transform | 232.952 | 21.075 | 17486 | 1 | 0 | 246 | 0 | 0 |
| validator | none | 0.017 | 0.003 | 0 | 0 | 0 | 0 | 0 | 0 |
| http | native-compiled-zod | 327.320 | 66.510 | 22236 | 2 | 0 | 948 | 0 | 0 |
| http | compiled-zod | 325.970 | 65.624 | 21121 | 2 | 0 | 867 | 0 | 0 |
| http | zod-manual-normalizer | 410.180 | 72.754 | 28968 | 2 | 0 | 895 | 0 | 0 |
| http | compiled-zod-manual-normalizer | 230.365 | 62.481 | 20714 | 2 | 0 | 769 | 0 | 0 |
| http | ajv | 225.362 | 59.087 | 16884 | 0 | 0 | 739 | 0 | 0 |
| http | typebox | 249.255 | 59.424 | 17912 | 1 | 0 | 786 | 0 | 0 |
| http | typebox-native-transform | 3429.803 | 191.627 | 49487 | 1 | 0 | 2180 | 0 | 0 |
| http | valibot | 362.457 | 66.998 | 22689 | 2 | 0 | 916 | 0 | 0 |
| http | valibot-native-transform | 326.015 | 65.709 | 21584 | 1 | 0 | 864 | 0 | 0 |
| http | none | 61.181 | 49.562 | 10801 | 0 | 0 | 625 | 0 | 0 |
| http | current-zod | 401.173 | 78.600 | 33909 | 2 | 0 | 988 | 0 | 0 |

## Individual samples

| Round | Order | PID | Mode | Variant | Primary (ms) | JSON.parse (ms) | Peak RSS (MiB) | Window RSS HWM increase (MiB) | User CPU (ms) | System CPU (ms) |
| ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 90477 | validator | current-zod | 166.067 | 60.222 | 546.4 | 296.2 | 287.442 | 25.603 |
| 1 | 2 | 90479 | validator | native-compiled-zod | 81.753 | 60.180 | 521.5 | 268.7 | 193.940 | 19.316 |
| 1 | 3 | 90481 | validator | compiled-zod | 115.703 | 60.603 | 531.1 | 281.1 | 208.784 | 21.034 |
| 1 | 4 | 90483 | validator | zod-manual-normalizer | 117.599 | 60.394 | 570.0 | 320.6 | 303.278 | 23.603 |
| 1 | 5 | 90485 | validator | compiled-zod-manual-normalizer | 64.042 | 59.700 | 418.4 | 168.0 | 145.702 | 13.034 |
| 1 | 6 | 90487 | validator | ajv | 61.262 | 63.034 | 364.2 | 98.1 | 157.352 | 8.840 |
| 1 | 7 | 90489 | validator | typebox | 75.295 | 60.688 | 426.9 | 162.3 | 164.754 | 12.103 |
| 1 | 8 | 90491 | validator | typebox-native-transform | 2679.910 | 60.943 | 721.0 | 445.0 | 3356.867 | 131.062 |
| 1 | 9 | 90497 | validator | valibot | 133.078 | 58.955 | 533.8 | 284.1 | 258.098 | 21.979 |
| 1 | 10 | 90500 | validator | valibot-native-transform | 162.825 | 60.602 | 523.6 | 273.1 | 228.640 | 22.565 |
| 1 | 11 | 90502 | validator | none | 0.002 | 58.068 | 247.0 | 0.0 | 0.016 | 0.002 |
| 1 | 1 | 90504 | http | native-compiled-zod | 200.007 | n/a | 514.1 | 345.9 | 327.359 | 66.494 |
| 1 | 2 | 90506 | http | compiled-zod | 224.420 | n/a | 520.7 | 354.8 | 326.158 | 62.880 |
| 1 | 3 | 90508 | http | zod-manual-normalizer | 234.036 | n/a | 585.2 | 420.3 | 412.211 | 72.028 |
| 1 | 4 | 90510 | http | compiled-zod-manual-normalizer | 176.000 | n/a | 512.4 | 345.7 | 229.328 | 62.175 |
| 1 | 5 | 90512 | http | ajv | 172.439 | n/a | 417.4 | 235.3 | 224.416 | 61.874 |
| 1 | 6 | 90515 | http | typebox | 185.403 | n/a | 462.7 | 279.4 | 249.178 | 58.041 |
| 1 | 7 | 90517 | http | typebox-native-transform | 2791.172 | n/a | 964.4 | 773.0 | 3429.457 | 194.354 |
| 1 | 8 | 90522 | http | valibot | 240.649 | n/a | 534.0 | 368.2 | 359.145 | 66.190 |
| 1 | 9 | 90525 | http | valibot-native-transform | 269.488 | n/a | 515.3 | 348.8 | 333.510 | 65.620 |
| 1 | 10 | 90527 | http | none | 109.632 | n/a | 355.8 | 191.1 | 61.086 | 51.189 |
| 1 | 11 | 90529 | http | current-zod | 287.774 | n/a | 694.1 | 528.4 | 404.609 | 80.631 |
| 2 | 1 | 90531 | validator | native-compiled-zod | 82.246 | 60.160 | 521.0 | 268.6 | 195.663 | 18.758 |
| 2 | 2 | 90533 | validator | compiled-zod | 116.470 | 59.536 | 532.8 | 282.8 | 209.721 | 20.084 |
| 2 | 3 | 90538 | validator | zod-manual-normalizer | 118.188 | 58.226 | 568.4 | 321.2 | 292.792 | 24.267 |
| 2 | 4 | 90540 | validator | compiled-zod-manual-normalizer | 63.578 | 60.627 | 417.0 | 168.0 | 136.908 | 12.498 |
| 2 | 5 | 90542 | validator | ajv | 58.834 | 61.632 | 407.8 | 142.0 | 136.454 | 10.233 |
| 2 | 6 | 90544 | validator | typebox | 77.286 | 61.696 | 429.4 | 162.3 | 166.034 | 12.676 |
| 2 | 7 | 90546 | validator | typebox-native-transform | 2659.050 | 61.055 | 720.0 | 445.3 | 3334.011 | 135.297 |
| 2 | 8 | 90549 | validator | valibot | 133.034 | 58.166 | 531.9 | 283.4 | 258.096 | 21.614 |
| 2 | 9 | 90552 | validator | valibot-native-transform | 163.361 | 58.773 | 524.2 | 274.7 | 231.892 | 22.244 |
| 2 | 10 | 90554 | validator | none | 0.002 | 59.192 | 248.7 | 0.0 | 0.016 | 0.002 |
| 2 | 11 | 90556 | validator | current-zod | 165.885 | 62.010 | 547.2 | 298.8 | 291.368 | 25.637 |
| 2 | 1 | 90558 | http | compiled-zod | 225.011 | n/a | 500.5 | 334.9 | 328.215 | 64.684 |
| 2 | 2 | 90560 | http | zod-manual-normalizer | 237.459 | n/a | 644.0 | 477.8 | 411.415 | 73.957 |
| 2 | 3 | 90562 | http | compiled-zod-manual-normalizer | 177.623 | n/a | 489.7 | 323.1 | 229.849 | 62.804 |
| 2 | 4 | 90564 | http | ajv | 172.006 | n/a | 441.3 | 260.4 | 226.122 | 58.543 |
| 2 | 5 | 90566 | http | typebox | 189.206 | n/a | 450.0 | 266.2 | 249.331 | 59.073 |
| 2 | 6 | 90568 | http | typebox-native-transform | 2792.559 | n/a | 963.2 | 770.9 | 3430.150 | 191.195 |
| 2 | 7 | 90571 | http | valibot | 236.993 | n/a | 531.8 | 366.8 | 362.127 | 63.364 |
| 2 | 8 | 90574 | http | valibot-native-transform | 265.638 | n/a | 463.3 | 298.2 | 324.243 | 63.753 |
| 2 | 9 | 90579 | http | none | 107.085 | n/a | 339.8 | 176.2 | 59.998 | 49.217 |
| 2 | 10 | 90581 | http | current-zod | 281.858 | n/a | 697.1 | 531.3 | 400.287 | 76.032 |
| 2 | 11 | 90583 | http | native-compiled-zod | 198.759 | n/a | 517.8 | 347.9 | 326.464 | 66.527 |
| 3 | 1 | 90585 | validator | compiled-zod | 114.961 | 60.827 | 531.4 | 281.4 | 211.642 | 20.304 |
| 3 | 2 | 90587 | validator | zod-manual-normalizer | 117.715 | 60.570 | 567.6 | 317.7 | 291.966 | 23.694 |
| 3 | 3 | 90589 | validator | compiled-zod-manual-normalizer | 66.244 | 58.206 | 372.2 | 124.2 | 176.691 | 10.753 |
| 3 | 4 | 90591 | validator | ajv | 58.114 | 62.511 | 406.4 | 142.2 | 135.928 | 10.381 |
| 3 | 5 | 90593 | validator | typebox | 76.006 | 61.616 | 430.1 | 162.0 | 164.751 | 12.698 |
| 3 | 6 | 90595 | validator | typebox-native-transform | 2661.012 | 61.949 | 722.7 | 446.5 | 3329.196 | 133.583 |
| 3 | 7 | 90599 | validator | valibot | 132.423 | 58.726 | 532.8 | 283.6 | 255.466 | 21.533 |
| 3 | 8 | 90601 | validator | valibot-native-transform | 157.998 | 57.230 | 407.2 | 158.1 | 260.343 | 16.474 |
| 3 | 9 | 90603 | validator | none | 0.002 | 61.018 | 248.4 | 0.0 | 0.013 | 0.003 |
| 3 | 10 | 90605 | validator | current-zod | 165.550 | 61.249 | 542.7 | 293.3 | 297.218 | 24.680 |
| 3 | 11 | 90607 | validator | native-compiled-zod | 82.393 | 60.160 | 520.5 | 268.3 | 191.844 | 19.319 |
| 3 | 1 | 90609 | http | zod-manual-normalizer | 231.068 | n/a | 614.6 | 448.6 | 406.603 | 72.556 |
| 3 | 2 | 90611 | http | compiled-zod-manual-normalizer | 176.975 | n/a | 514.7 | 348.8 | 230.250 | 61.020 |
| 3 | 3 | 90613 | http | ajv | 168.542 | n/a | 449.7 | 266.7 | 224.924 | 59.132 |
| 3 | 4 | 90615 | http | typebox | 189.517 | n/a | 447.9 | 263.8 | 247.711 | 62.105 |
| 3 | 5 | 90617 | http | typebox-native-transform | 2802.538 | n/a | 964.3 | 772.5 | 3450.109 | 191.312 |
| 3 | 6 | 90623 | http | valibot | 240.677 | n/a | 528.1 | 362.0 | 360.641 | 66.290 |
| 3 | 7 | 90626 | http | valibot-native-transform | 270.631 | n/a | 492.2 | 326.2 | 323.095 | 67.706 |
| 3 | 8 | 90628 | http | none | 111.219 | n/a | 333.5 | 168.9 | 61.975 | 51.228 |
| 3 | 9 | 90630 | http | current-zod | 285.492 | n/a | 688.3 | 523.9 | 400.256 | 79.023 |
| 3 | 10 | 90632 | http | native-compiled-zod | 195.887 | n/a | 517.4 | 349.3 | 327.829 | 65.713 |
| 3 | 11 | 90634 | http | compiled-zod | 227.511 | n/a | 495.9 | 330.4 | 325.322 | 66.135 |
| 4 | 1 | 90636 | validator | zod-manual-normalizer | 118.695 | 60.161 | 563.3 | 315.2 | 290.506 | 24.020 |
| 4 | 2 | 90638 | validator | compiled-zod-manual-normalizer | 64.510 | 57.196 | 417.5 | 167.7 | 146.955 | 12.173 |
| 4 | 3 | 90640 | validator | ajv | 58.762 | 62.339 | 408.7 | 143.0 | 137.238 | 10.612 |
| 4 | 4 | 90642 | validator | typebox | 75.387 | 61.244 | 428.0 | 161.6 | 157.926 | 12.095 |
| 4 | 5 | 90644 | validator | typebox-native-transform | 2613.846 | 61.621 | 721.6 | 445.4 | 3278.205 | 130.538 |
| 4 | 6 | 90648 | validator | valibot | 130.403 | 59.228 | 533.1 | 283.3 | 263.649 | 20.509 |
| 4 | 7 | 90651 | validator | valibot-native-transform | 157.180 | 58.218 | 407.9 | 160.3 | 264.745 | 16.723 |
| 4 | 8 | 90653 | validator | none | 0.006 | 58.715 | 248.4 | 0.0 | 0.021 | 0.002 |
| 4 | 9 | 90655 | validator | current-zod | 167.415 | 61.193 | 546.5 | 298.7 | 292.430 | 25.985 |
| 4 | 10 | 90657 | validator | native-compiled-zod | 87.055 | 57.786 | 441.2 | 188.6 | 274.608 | 16.926 |
| 4 | 11 | 90659 | validator | compiled-zod | 117.422 | 60.854 | 530.0 | 281.2 | 211.987 | 20.947 |
| 4 | 1 | 90661 | http | compiled-zod-manual-normalizer | 174.697 | n/a | 458.4 | 292.7 | 230.481 | 59.921 |
| 4 | 2 | 90663 | http | ajv | 170.954 | n/a | 467.6 | 284.0 | 225.373 | 59.421 |
| 4 | 3 | 90665 | http | typebox | 184.998 | n/a | 467.6 | 282.1 | 245.834 | 58.235 |
| 4 | 4 | 90667 | http | typebox-native-transform | 2811.938 | n/a | 965.6 | 773.6 | 3461.220 | 191.942 |
| 4 | 5 | 90674 | http | valibot | 244.330 | n/a | 511.5 | 345.9 | 362.746 | 70.522 |
| 4 | 6 | 90678 | http | valibot-native-transform | 264.774 | n/a | 515.5 | 350.6 | 332.645 | 65.624 |
| 4 | 7 | 90680 | http | none | 109.618 | n/a | 304.2 | 140.0 | 62.389 | 49.060 |
| 4 | 8 | 90682 | http | current-zod | 281.090 | n/a | 722.7 | 556.8 | 401.824 | 76.945 |
| 4 | 9 | 90684 | http | native-compiled-zod | 198.847 | n/a | 515.9 | 347.2 | 330.192 | 68.148 |
| 4 | 10 | 90686 | http | compiled-zod | 227.419 | n/a | 468.3 | 302.9 | 329.237 | 64.478 |
| 4 | 11 | 90688 | http | zod-manual-normalizer | 233.898 | n/a | 635.9 | 469.9 | 409.785 | 75.542 |
| 5 | 1 | 90690 | validator | compiled-zod-manual-normalizer | 63.440 | 60.017 | 417.0 | 167.8 | 131.875 | 11.766 |
| 5 | 2 | 90692 | validator | ajv | 57.825 | 60.245 | 407.7 | 143.3 | 136.126 | 10.321 |
| 5 | 3 | 90694 | validator | typebox | 77.269 | 62.551 | 432.1 | 162.4 | 166.404 | 12.740 |
| 5 | 4 | 90696 | validator | typebox-native-transform | 2630.650 | 61.110 | 718.1 | 444.2 | 3296.973 | 130.491 |
| 5 | 5 | 90699 | validator | valibot | 133.415 | 58.898 | 534.5 | 285.1 | 259.848 | 22.503 |
| 5 | 6 | 90702 | validator | valibot-native-transform | 156.603 | 60.872 | 522.8 | 274.4 | 224.088 | 20.467 |
| 5 | 7 | 90704 | validator | none | 0.002 | 59.127 | 247.8 | 0.0 | 0.017 | 0.003 |
| 5 | 8 | 90706 | validator | current-zod | 167.495 | 61.016 | 547.2 | 298.0 | 300.195 | 24.966 |
| 5 | 9 | 90708 | validator | native-compiled-zod | 82.360 | 61.858 | 521.5 | 268.9 | 195.103 | 19.526 |
| 5 | 10 | 90710 | validator | compiled-zod | 117.186 | 60.499 | 529.0 | 280.3 | 217.988 | 20.581 |
| 5 | 11 | 90712 | validator | zod-manual-normalizer | 118.111 | 60.098 | 567.9 | 319.3 | 292.794 | 23.620 |
| 5 | 1 | 90714 | http | ajv | 170.951 | n/a | 445.3 | 263.8 | 224.088 | 60.125 |
| 5 | 2 | 90716 | http | typebox | 185.603 | n/a | 446.8 | 264.3 | 246.791 | 57.480 |
| 5 | 3 | 90718 | http | typebox-native-transform | 2765.798 | n/a | 964.7 | 772.0 | 3406.533 | 189.638 |
| 5 | 4 | 90724 | http | valibot | 241.820 | n/a | 527.5 | 362.0 | 363.715 | 67.425 |
| 5 | 5 | 90727 | http | valibot-native-transform | 267.992 | n/a | 461.3 | 297.1 | 323.468 | 65.793 |
| 5 | 6 | 90729 | http | none | 111.795 | n/a | 332.5 | 167.3 | 60.870 | 50.518 |
| 5 | 7 | 90731 | http | current-zod | 285.378 | n/a | 717.9 | 554.8 | 402.484 | 78.177 |
| 5 | 8 | 90733 | http | native-compiled-zod | 194.083 | n/a | 539.5 | 370.3 | 325.587 | 66.621 |
| 5 | 9 | 90735 | http | compiled-zod | 226.877 | n/a | 489.0 | 325.9 | 329.538 | 66.664 |
| 5 | 10 | 90737 | http | zod-manual-normalizer | 232.196 | n/a | 620.1 | 456.6 | 410.781 | 72.952 |
| 5 | 11 | 90741 | http | compiled-zod-manual-normalizer | 176.915 | n/a | 480.7 | 317.4 | 230.921 | 62.915 |
| 6 | 1 | 90743 | validator | ajv | 58.043 | 60.822 | 408.2 | 142.8 | 136.177 | 10.633 |
| 6 | 2 | 90745 | validator | typebox | 76.932 | 59.719 | 431.9 | 162.1 | 165.949 | 12.401 |
| 6 | 3 | 90747 | validator | typebox-native-transform | 2634.481 | 61.107 | 719.1 | 447.1 | 3311.933 | 130.406 |
| 6 | 4 | 90749 | validator | valibot | 133.364 | 58.993 | 532.8 | 283.6 | 260.212 | 21.563 |
| 6 | 5 | 90751 | validator | valibot-native-transform | 164.085 | 58.622 | 522.9 | 273.4 | 234.012 | 22.916 |
| 6 | 6 | 90753 | validator | none | 0.003 | 58.231 | 248.0 | 0.0 | 0.018 | 0.006 |
| 6 | 7 | 90755 | validator | current-zod | 167.051 | 60.397 | 546.7 | 297.7 | 298.745 | 24.872 |
| 6 | 8 | 90757 | validator | native-compiled-zod | 80.901 | 60.696 | 520.4 | 269.0 | 194.387 | 18.413 |
| 6 | 9 | 90759 | validator | compiled-zod | 116.039 | 60.755 | 529.2 | 279.7 | 209.121 | 20.742 |
| 6 | 10 | 90761 | validator | zod-manual-normalizer | 119.779 | 59.146 | 568.4 | 319.3 | 296.909 | 24.994 |
| 6 | 11 | 90763 | validator | compiled-zod-manual-normalizer | 66.863 | 57.005 | 373.7 | 124.2 | 176.340 | 10.464 |
| 6 | 1 | 90768 | http | typebox | 195.370 | n/a | 470.3 | 287.1 | 252.195 | 61.495 |
| 6 | 2 | 90770 | http | typebox-native-transform | 2780.907 | n/a | 967.1 | 773.5 | 3415.913 | 194.649 |
| 6 | 3 | 90774 | http | valibot | 240.698 | n/a | 532.1 | 366.6 | 366.449 | 65.641 |
| 6 | 4 | 90777 | http | valibot-native-transform | 269.222 | n/a | 512.7 | 348.3 | 325.471 | 68.042 |
| 6 | 5 | 90779 | http | none | 110.016 | n/a | 355.4 | 190.7 | 61.322 | 50.865 |
| 6 | 6 | 90781 | http | current-zod | 277.797 | n/a | 668.6 | 504.1 | 396.900 | 77.337 |
| 6 | 7 | 90783 | http | native-compiled-zod | 197.714 | n/a | 516.0 | 347.6 | 326.338 | 66.393 |
| 6 | 8 | 90786 | http | compiled-zod | 227.746 | n/a | 524.8 | 357.8 | 328.306 | 65.112 |
| 6 | 9 | 90788 | http | zod-manual-normalizer | 231.007 | n/a | 613.0 | 448.5 | 408.379 | 71.426 |
| 6 | 10 | 90790 | http | compiled-zod-manual-normalizer | 178.173 | n/a | 488.2 | 323.0 | 228.940 | 62.787 |
| 6 | 11 | 90792 | http | ajv | 168.121 | n/a | 446.1 | 263.9 | 226.627 | 56.745 |
| 7 | 1 | 90795 | validator | typebox | 85.825 | 61.346 | 428.4 | 162.1 | 172.114 | 14.347 |
| 7 | 2 | 90798 | validator | typebox-native-transform | 2647.379 | 60.428 | 719.9 | 446.3 | 3336.297 | 128.008 |
| 7 | 3 | 90801 | validator | valibot | 133.262 | 58.712 | 532.1 | 283.8 | 265.431 | 21.754 |
| 7 | 4 | 90804 | validator | valibot-native-transform | 161.038 | 59.518 | 523.7 | 274.8 | 223.157 | 21.683 |
| 7 | 5 | 90806 | validator | none | 0.001 | 58.889 | 248.2 | 0.0 | 0.015 | 0.002 |
| 7 | 6 | 90808 | validator | current-zod | 173.247 | 60.595 | 543.9 | 294.4 | 309.279 | 24.623 |
| 7 | 7 | 90813 | validator | native-compiled-zod | 87.912 | 57.497 | 437.7 | 185.9 | 271.795 | 16.761 |
| 7 | 8 | 90815 | validator | compiled-zod | 117.324 | 60.540 | 531.9 | 281.9 | 213.237 | 21.284 |
| 7 | 9 | 90817 | validator | zod-manual-normalizer | 118.232 | 60.284 | 567.1 | 317.9 | 298.789 | 23.606 |
| 7 | 10 | 90819 | validator | compiled-zod-manual-normalizer | 65.719 | 59.116 | 417.8 | 168.1 | 141.357 | 12.404 |
| 7 | 11 | 90821 | validator | ajv | 58.502 | 62.151 | 407.2 | 144.0 | 136.074 | 10.907 |
| 7 | 1 | 90823 | http | typebox-native-transform | 2807.403 | n/a | 994.3 | 803.0 | 3443.352 | 194.233 |
| 7 | 2 | 90826 | http | valibot | 243.162 | n/a | 511.1 | 345.3 | 366.784 | 67.307 |
| 7 | 3 | 90829 | http | valibot-native-transform | 270.492 | n/a | 514.0 | 348.6 | 332.492 | 66.124 |
| 7 | 4 | 90831 | http | none | 109.046 | n/a | 330.9 | 165.9 | 60.301 | 49.050 |
| 7 | 5 | 90833 | http | current-zod | 287.436 | n/a | 718.3 | 552.8 | 402.326 | 79.531 |
| 7 | 6 | 90835 | http | native-compiled-zod | 195.511 | n/a | 514.0 | 345.7 | 326.256 | 65.427 |
| 7 | 7 | 90837 | http | compiled-zod | 226.651 | n/a | 475.8 | 309.4 | 325.782 | 66.663 |
| 7 | 8 | 90839 | http | zod-manual-normalizer | 231.869 | n/a | 637.8 | 472.1 | 413.812 | 70.902 |
| 7 | 9 | 90841 | http | compiled-zod-manual-normalizer | 180.430 | n/a | 503.2 | 337.4 | 231.309 | 66.390 |
| 7 | 10 | 90843 | http | ajv | 169.648 | n/a | 468.3 | 286.4 | 225.351 | 59.041 |
| 7 | 11 | 90845 | http | typebox | 184.033 | n/a | 498.0 | 316.3 | 248.024 | 56.752 |
| 8 | 1 | 90847 | validator | typebox-native-transform | 2653.521 | 60.702 | 731.0 | 454.9 | 3346.493 | 131.998 |
| 8 | 2 | 90853 | validator | valibot | 133.464 | 59.421 | 534.3 | 284.6 | 257.342 | 22.171 |
| 8 | 3 | 90856 | validator | valibot-native-transform | 162.732 | 59.817 | 523.5 | 273.5 | 224.060 | 22.340 |
| 8 | 4 | 90858 | validator | none | 0.002 | 58.967 | 248.2 | 0.0 | 0.014 | 0.003 |
| 8 | 5 | 90860 | validator | current-zod | 175.409 | 57.098 | 565.3 | 317.4 | 342.054 | 27.376 |
| 8 | 6 | 90862 | validator | native-compiled-zod | 87.939 | 56.926 | 440.5 | 189.3 | 279.510 | 16.521 |
| 8 | 7 | 90864 | validator | compiled-zod | 120.682 | 57.580 | 418.2 | 169.9 | 275.799 | 15.849 |
| 8 | 8 | 90866 | validator | zod-manual-normalizer | 117.091 | 60.837 | 562.9 | 314.1 | 281.978 | 24.131 |
| 8 | 9 | 90868 | validator | compiled-zod-manual-normalizer | 63.496 | 60.015 | 417.7 | 168.1 | 138.164 | 12.348 |
| 8 | 10 | 90870 | validator | ajv | 58.059 | 63.121 | 408.2 | 142.8 | 135.930 | 10.658 |
| 8 | 11 | 90872 | validator | typebox | 79.047 | 71.380 | 430.8 | 162.9 | 170.748 | 12.958 |
| 8 | 1 | 90874 | http | valibot | 240.376 | n/a | 505.6 | 340.9 | 357.053 | 67.788 |
| 8 | 2 | 90876 | http | valibot-native-transform | 271.057 | n/a | 491.2 | 325.4 | 326.560 | 67.065 |
| 8 | 3 | 90878 | http | none | 108.810 | n/a | 333.1 | 168.6 | 60.926 | 49.907 |
| 8 | 4 | 90880 | http | current-zod | 282.588 | n/a | 699.8 | 534.3 | 400.522 | 79.845 |
| 8 | 5 | 90882 | http | native-compiled-zod | 205.266 | n/a | 488.3 | 318.6 | 335.144 | 67.579 |
| 8 | 6 | 90886 | http | compiled-zod | 228.758 | n/a | 496.1 | 329.7 | 325.048 | 67.759 |
| 8 | 7 | 90888 | http | zod-manual-normalizer | 236.660 | n/a | 610.6 | 445.2 | 409.120 | 75.241 |
| 8 | 8 | 90890 | http | compiled-zod-manual-normalizer | 177.047 | n/a | 510.3 | 344.4 | 230.843 | 61.258 |
| 8 | 9 | 90892 | http | ajv | 169.303 | n/a | 417.2 | 235.0 | 222.352 | 57.874 |
| 8 | 10 | 90894 | http | typebox | 186.475 | n/a | 492.5 | 311.1 | 250.306 | 59.775 |
| 8 | 11 | 90896 | http | typebox-native-transform | 2740.307 | n/a | 969.5 | 778.8 | 3392.235 | 185.441 |
| 9 | 1 | 90899 | validator | valibot | 132.268 | 59.224 | 532.2 | 283.1 | 257.084 | 21.848 |
| 9 | 2 | 90901 | validator | valibot-native-transform | 160.006 | 57.485 | 409.3 | 160.8 | 273.923 | 16.768 |
| 9 | 3 | 90903 | validator | none | 0.002 | 58.543 | 248.6 | 0.0 | 0.017 | 0.002 |
| 9 | 4 | 90905 | validator | current-zod | 165.759 | 60.929 | 545.2 | 296.8 | 291.802 | 24.721 |
| 9 | 5 | 90907 | validator | native-compiled-zod | 87.180 | 57.669 | 438.9 | 186.4 | 274.107 | 16.190 |
| 9 | 6 | 90909 | validator | compiled-zod | 118.121 | 63.501 | 418.0 | 169.4 | 275.241 | 15.941 |
| 9 | 7 | 90914 | validator | zod-manual-normalizer | 120.597 | 59.042 | 568.8 | 319.8 | 308.068 | 24.768 |
| 9 | 8 | 90916 | validator | compiled-zod-manual-normalizer | 64.303 | 60.908 | 416.2 | 167.8 | 139.586 | 11.973 |
| 9 | 9 | 90919 | validator | ajv | 58.881 | 61.079 | 407.0 | 142.7 | 136.354 | 10.591 |
| 9 | 10 | 90922 | validator | typebox | 75.811 | 60.641 | 430.8 | 161.8 | 158.849 | 12.198 |
| 9 | 11 | 90924 | validator | typebox-native-transform | 2655.997 | 62.323 | 828.0 | 554.6 | 3393.622 | 134.839 |
| 9 | 1 | 90933 | http | valibot-native-transform | 264.167 | n/a | 516.0 | 351.2 | 333.263 | 57.909 |
| 9 | 2 | 90935 | http | none | 108.345 | n/a | 323.8 | 161.6 | 61.276 | 47.581 |
| 9 | 3 | 90937 | http | current-zod | 278.853 | n/a | 663.6 | 497.6 | 399.535 | 72.066 |
| 9 | 4 | 90939 | http | native-compiled-zod | 195.501 | n/a | 555.8 | 386.4 | 327.282 | 63.028 |
| 9 | 5 | 90942 | http | compiled-zod | 231.195 | n/a | 495.1 | 328.5 | 323.100 | 66.486 |
| 9 | 6 | 90944 | http | zod-manual-normalizer | 230.742 | n/a | 636.2 | 472.0 | 410.576 | 71.521 |
| 9 | 7 | 90946 | http | compiled-zod-manual-normalizer | 174.797 | n/a | 461.4 | 296.4 | 228.316 | 60.162 |
| 9 | 8 | 90950 | http | ajv | 170.410 | n/a | 447.6 | 264.4 | 226.325 | 59.925 |
| 9 | 9 | 90952 | http | typebox | 185.483 | n/a | 465.6 | 280.4 | 250.496 | 60.342 |
| 9 | 10 | 90954 | http | typebox-native-transform | 2796.828 | n/a | 964.7 | 771.1 | 3431.402 | 194.256 |
| 9 | 11 | 90956 | http | valibot | 241.044 | n/a | 512.2 | 347.1 | 364.063 | 66.688 |
| 10 | 1 | 90962 | validator | valibot-native-transform | 158.553 | 56.802 | 405.8 | 158.9 | 261.825 | 16.881 |
| 10 | 2 | 90964 | validator | none | 0.002 | 59.135 | 247.3 | 0.0 | 0.017 | 0.003 |
| 10 | 3 | 90966 | validator | current-zod | 173.474 | 56.987 | 569.8 | 321.9 | 342.854 | 27.482 |
| 10 | 4 | 90968 | validator | native-compiled-zod | 82.154 | 59.688 | 520.5 | 268.6 | 196.176 | 19.124 |
| 10 | 5 | 90971 | validator | compiled-zod | 116.679 | 62.268 | 532.0 | 282.3 | 220.863 | 20.932 |
| 10 | 6 | 90974 | validator | zod-manual-normalizer | 119.919 | 60.314 | 566.5 | 318.2 | 304.098 | 23.912 |
| 10 | 7 | 90976 | validator | compiled-zod-manual-normalizer | 62.596 | 60.465 | 417.6 | 168.0 | 137.243 | 11.789 |
| 10 | 8 | 90978 | validator | ajv | 58.061 | 60.813 | 407.6 | 142.8 | 135.391 | 10.786 |
| 10 | 9 | 90980 | validator | typebox | 78.194 | 56.444 | 370.6 | 103.4 | 185.999 | 10.106 |
| 10 | 10 | 90982 | validator | typebox-native-transform | 2657.110 | 61.969 | 721.0 | 447.8 | 3325.333 | 130.879 |
| 10 | 11 | 90984 | validator | valibot | 132.367 | 59.170 | 534.2 | 284.2 | 257.010 | 21.751 |
| 10 | 1 | 90986 | http | none | 108.877 | n/a | 334.6 | 169.8 | 62.025 | 49.200 |
| 10 | 2 | 90988 | http | current-zod | 285.518 | n/a | 693.7 | 527.8 | 402.716 | 80.265 |
| 10 | 3 | 90990 | http | native-compiled-zod | 206.759 | n/a | 510.3 | 340.6 | 333.337 | 67.805 |
| 10 | 4 | 90993 | http | compiled-zod | 229.167 | n/a | 516.9 | 352.1 | 325.592 | 64.773 |
| 10 | 5 | 90996 | http | zod-manual-normalizer | 235.131 | n/a | 606.0 | 442.5 | 409.616 | 74.132 |
| 10 | 6 | 90998 | http | compiled-zod-manual-normalizer | 178.102 | n/a | 490.6 | 324.2 | 231.652 | 63.775 |
| 10 | 7 | 91000 | http | ajv | 169.409 | n/a | 416.3 | 233.7 | 226.307 | 57.144 |
| 10 | 8 | 91002 | http | typebox | 187.512 | n/a | 462.7 | 277.6 | 250.171 | 59.922 |
| 10 | 9 | 91004 | http | typebox-native-transform | 2753.387 | n/a | 998.0 | 805.4 | 3403.064 | 184.600 |
| 10 | 10 | 91009 | http | valibot | 241.954 | n/a | 482.3 | 317.1 | 362.167 | 68.256 |
| 10 | 11 | 91011 | http | valibot-native-transform | 266.673 | n/a | 463.8 | 298.9 | 323.685 | 65.427 |
