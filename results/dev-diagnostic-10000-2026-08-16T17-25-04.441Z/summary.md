# Development benchmark summary

> Non-public smoke/development output. Do not use these samples for performance claims.

- Run: `dev-diagnostic-10000-2026-08-16T17-25-04.441Z`
- Profile: `diagnostic-10000` (49149405 bytes)
- Validation envelope: `diagnostic` (maximum 10000 reports)
- Seed: `20260807`
- Fresh-process rounds per mode/variant: 10
- Command: `bun run benchmark --profile diagnostic-10000 --seed 20260807 --rounds 10 --mode validator`
- Bun: 1.3.14; Hono: 4.12.11
- Execution environment: native-host
- Container limits: n/a
- Container whole-run memory peak: n/a
- Machine-idle assertion: not asserted
- Host load average before: 2.24, 1.83, 1.69
- Host load average after: 2.28, 1.90, 1.72

Quantiles use linear interpolation. P95 is omitted for groups with fewer than 20 samples.
Host activity is observational metadata, not proof that unrelated host work was absent.

## Primary duration

| Mode | Variant | Samples | Min (ms) | P25 (ms) | Median (ms) | P75 (ms) | Max (ms) | IQR (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| validator | current-zod | 10 | 187.754 | 190.789 | 191.683 | 192.740 | 214.020 | 1.951 |
| validator | compiled-zod | 10 | 116.520 | 118.594 | 119.223 | 119.441 | 120.606 | 0.847 |
| validator | zod-manual-normalizer | 10 | 133.692 | 136.194 | 137.448 | 138.081 | 173.606 | 1.887 |
| validator | compiled-zod-manual-normalizer | 10 | 64.480 | 64.647 | 65.107 | 65.610 | 102.253 | 0.963 |
| validator | ajv | 10 | 60.898 | 61.094 | 61.729 | 62.154 | 62.634 | 1.060 |
| validator | typebox | 10 | 74.744 | 77.297 | 77.906 | 78.320 | 79.488 | 1.023 |
| validator | typebox-native-transform | 10 | 2484.426 | 2525.085 | 2530.844 | 2550.710 | 2587.073 | 25.625 |
| validator | valibot | 10 | 128.901 | 130.230 | 131.569 | 132.677 | 145.510 | 2.447 |
| validator | valibot-native-transform | 10 | 156.030 | 157.892 | 158.985 | 161.232 | 162.999 | 3.339 |
| validator | none | 10 | 0.002 | 0.002 | 0.002 | 0.003 | 0.003 | 0.001 |

Validator mode measures validation and normalization from an already parsed value. HTTP mode measures a complete loopback request through Bun.serve and Hono, including server-side JSON decoding and response consumption.

## JSON.parse duration

This decode timer is recorded separately in validator-mode children and is excluded from the primary validator timer.

| Variant | Samples | Min (ms) | Median (ms) | Max (ms) |
| --- | ---: | ---: | ---: | ---: |
| current-zod | 10 | 55.870 | 56.686 | 58.070 |
| compiled-zod | 10 | 55.545 | 56.688 | 59.822 |
| zod-manual-normalizer | 10 | 54.983 | 55.849 | 57.992 |
| compiled-zod-manual-normalizer | 10 | 55.192 | 55.568 | 57.527 |
| ajv | 10 | 55.515 | 56.270 | 61.915 |
| typebox | 10 | 55.738 | 56.356 | 59.792 |
| typebox-native-transform | 10 | 55.699 | 56.274 | 57.915 |
| valibot | 10 | 55.052 | 55.899 | 59.438 |
| valibot-native-transform | 10 | 55.533 | 57.086 | 59.362 |
| none | 10 | 55.502 | 56.604 | 58.325 |

## OS-observed peak RSS

The whole-child peak includes module setup, input decoding, validation, and result serialization. The measured-window high-water increase is the change in the process high-water mark between snapshots immediately before and after the primary timer; zero means the operation did not exceed an earlier process peak.

| Mode | Variant | Samples | Whole-child peak median (MiB) | Whole-child peak max (MiB) | Measured-window high-water increase median (MiB) |
| --- | --- | ---: | ---: | ---: | ---: |
| validator | current-zod | 10 | 560.2 | 561.6 | 311.9 |
| validator | compiled-zod | 10 | 418.5 | 419.8 | 170.5 |
| validator | zod-manual-normalizer | 10 | 524.7 | 531.5 | 277.2 |
| validator | compiled-zod-manual-normalizer | 10 | 374.2 | 376.1 | 126.9 |
| validator | ajv | 10 | 365.7 | 367.9 | 101.7 |
| validator | typebox | 10 | 372.2 | 429.3 | 104.5 |
| validator | typebox-native-transform | 10 | 824.7 | 831.0 | 549.6 |
| validator | valibot | 10 | 424.1 | 534.1 | 176.7 |
| validator | valibot-native-transform | 10 | 409.4 | 522.5 | 161.5 |
| validator | none | 10 | 246.9 | 247.9 | 0.0 |

## In-process RSS change

The before/after deltas keep the request text, parsed input, and validated result reachable. They show retained process and JavaScript-managed memory, not a sampled transient peak. Component deltas can still be negative when the runtime releases backing storage or changes allocator accounting.

| Mode | Variant | RSS before median (MiB) | RSS after median (MiB) | RSS delta median (MiB) | Heap used delta median (MiB) | Heap capacity delta median (MiB) | External delta median (MiB) | ArrayBuffer delta median (MiB) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| validator | current-zod | 247.5 | 559.5 | 311.9 | 87.3 | 275.1 | 36.1 | 0.0 |
| validator | compiled-zod | 247.5 | 417.7 | 170.5 | 73.7 | 134.1 | 33.7 | 0.0 |
| validator | zod-manual-normalizer | 246.9 | 523.7 | 277.2 | 72.1 | 218.8 | 31.9 | 0.0 |
| validator | compiled-zod-manual-normalizer | 246.6 | 373.3 | 126.9 | 87.6 | 90.1 | 33.1 | 0.0 |
| validator | ajv | 264.1 | 365.1 | 101.7 | 54.3 | 74.8 | 23.6 | 0.0 |
| validator | typebox | 266.9 | 371.4 | 104.5 | 57.7 | 75.1 | 24.9 | 0.0 |
| validator | typebox-native-transform | 275.5 | 824.3 | 549.6 | 116.7 | 430.2 | 40.2 | 0.0 |
| validator | valibot | 246.8 | 423.2 | 176.7 | 76.2 | 142.5 | 29.9 | 0.0 |
| validator | valibot-native-transform | 246.9 | 408.8 | 161.5 | 73.0 | 130.3 | 32.7 | 0.0 |
| validator | none | 245.7 | 245.7 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |

## Measured-window OS resource deltas

CPU and kernel counters are snapshots around the same primary interval as the duration timer. CPU time is summed across process threads and can therefore exceed wall time.

| Mode | Variant | User CPU median (ms) | System CPU median (ms) | Minor faults median | Major faults median | Voluntary switches median | Involuntary switches median | FS reads median | FS writes median |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| validator | current-zod | 358.410 | 27.026 | 19960 | 2 | 0 | 393 | 0 | 0 |
| validator | compiled-zod | 281.610 | 16.282 | 10912 | 2 | 0 | 262 | 0 | 0 |
| validator | zod-manual-normalizer | 386.921 | 23.852 | 17742 | 2 | 0 | 300 | 0 | 0 |
| validator | compiled-zod-manual-normalizer | 169.217 | 10.649 | 8119 | 1 | 0 | 132 | 0 | 0 |
| validator | ajv | 164.088 | 9.050 | 6507 | 0 | 0 | 129 | 0 | 0 |
| validator | typebox | 180.288 | 10.021 | 6688 | 1 | 0 | 149 | 0 | 0 |
| validator | typebox-native-transform | 3264.677 | 119.368 | 35177 | 1 | 0 | 1244 | 0 | 0 |
| validator | valibot | 297.813 | 16.651 | 11305 | 2 | 0 | 280 | 0 | 0 |
| validator | valibot-native-transform | 272.940 | 15.623 | 10337 | 1 | 0 | 249 | 0 | 0 |
| validator | none | 0.012 | 0.003 | 0 | 0 | 0 | 0 | 0 | 0 |

## Individual samples

| Round | Order | PID | Mode | Variant | Primary (ms) | JSON.parse (ms) | Peak RSS (MiB) | Window RSS HWM increase (MiB) | User CPU (ms) | System CPU (ms) |
| ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 24117 | validator | current-zod | 191.196 | 56.605 | 560.7 | 312.3 | 357.808 | 26.856 |
| 1 | 2 | 24119 | validator | compiled-zod | 120.606 | 57.156 | 419.8 | 171.0 | 283.697 | 16.472 |
| 1 | 3 | 24139 | validator | zod-manual-normalizer | 134.795 | 56.283 | 522.6 | 274.5 | 379.053 | 23.188 |
| 1 | 4 | 24141 | validator | compiled-zod-manual-normalizer | 64.480 | 55.384 | 372.4 | 124.8 | 166.333 | 10.408 |
| 1 | 5 | 24143 | validator | ajv | 61.756 | 57.402 | 366.9 | 102.1 | 164.233 | 9.966 |
| 1 | 6 | 24163 | validator | typebox | 79.488 | 56.043 | 371.8 | 104.2 | 180.933 | 9.970 |
| 1 | 7 | 24165 | validator | typebox-native-transform | 2502.457 | 55.699 | 820.3 | 544.6 | 3234.228 | 119.252 |
| 1 | 8 | 24224 | validator | valibot | 129.082 | 55.052 | 424.6 | 176.6 | 297.118 | 16.123 |
| 1 | 9 | 24228 | validator | valibot-native-transform | 158.802 | 56.989 | 407.2 | 160.4 | 275.362 | 15.306 |
| 1 | 10 | 24249 | validator | none | 0.002 | 55.502 | 247.2 | 0.0 | 0.013 | 0.003 |
| 2 | 1 | 24251 | validator | compiled-zod | 116.520 | 55.545 | 417.9 | 169.6 | 277.777 | 15.997 |
| 2 | 2 | 24253 | validator | zod-manual-normalizer | 138.188 | 54.983 | 523.5 | 275.6 | 384.248 | 23.990 |
| 2 | 3 | 24273 | validator | compiled-zod-manual-normalizer | 64.833 | 55.679 | 375.0 | 127.4 | 169.380 | 10.076 |
| 2 | 4 | 24275 | validator | ajv | 62.016 | 55.515 | 364.2 | 103.1 | 165.189 | 9.185 |
| 2 | 5 | 24277 | validator | typebox | 77.717 | 56.428 | 373.1 | 104.7 | 179.696 | 9.956 |
| 2 | 6 | 24279 | validator | typebox-native-transform | 2528.801 | 56.771 | 831.0 | 555.1 | 3265.117 | 119.483 |
| 2 | 7 | 24355 | validator | valibot | 130.143 | 55.909 | 423.4 | 177.0 | 297.311 | 16.829 |
| 2 | 8 | 24357 | validator | valibot-native-transform | 157.786 | 55.724 | 409.1 | 161.5 | 272.387 | 15.553 |
| 2 | 9 | 24359 | validator | none | 0.003 | 56.873 | 245.3 | 0.0 | 0.012 | 0.001 |
| 2 | 10 | 24379 | validator | current-zod | 192.169 | 56.224 | 557.9 | 311.6 | 363.480 | 26.602 |
| 3 | 1 | 24381 | validator | zod-manual-normalizer | 137.593 | 55.774 | 521.5 | 274.2 | 379.035 | 23.378 |
| 3 | 2 | 24383 | validator | compiled-zod-manual-normalizer | 64.642 | 57.348 | 374.9 | 128.2 | 170.633 | 10.429 |
| 3 | 3 | 24403 | validator | ajv | 61.116 | 56.530 | 365.5 | 100.8 | 163.932 | 8.946 |
| 3 | 4 | 24405 | validator | typebox | 77.426 | 56.320 | 372.2 | 104.2 | 177.713 | 10.071 |
| 3 | 5 | 24407 | validator | typebox-native-transform | 2563.730 | 56.465 | 829.0 | 553.2 | 3280.148 | 122.310 |
| 3 | 6 | 24466 | validator | valibot | 131.064 | 58.445 | 423.8 | 175.9 | 297.304 | 16.605 |
| 3 | 7 | 24486 | validator | valibot-native-transform | 162.999 | 59.156 | 409.7 | 163.4 | 279.728 | 16.073 |
| 3 | 8 | 24488 | validator | none | 0.002 | 57.228 | 246.6 | 0.0 | 0.011 | 0.008 |
| 3 | 9 | 24490 | validator | current-zod | 192.836 | 56.523 | 559.9 | 312.1 | 358.328 | 28.698 |
| 3 | 10 | 24511 | validator | compiled-zod | 117.246 | 55.615 | 416.1 | 169.0 | 279.043 | 15.380 |
| 4 | 1 | 24514 | validator | compiled-zod-manual-normalizer | 65.794 | 55.457 | 373.2 | 125.4 | 175.809 | 10.745 |
| 4 | 2 | 24516 | validator | ajv | 62.274 | 61.915 | 365.3 | 101.3 | 165.157 | 8.890 |
| 4 | 3 | 24518 | validator | typebox | 78.095 | 56.423 | 368.4 | 104.1 | 187.104 | 9.781 |
| 4 | 4 | 24538 | validator | typebox-native-transform | 2532.887 | 57.915 | 824.6 | 548.0 | 3259.014 | 117.539 |
| 4 | 5 | 24594 | validator | valibot | 145.510 | 55.577 | 424.4 | 177.2 | 317.054 | 17.462 |
| 4 | 6 | 24596 | validator | valibot-native-transform | 161.508 | 59.362 | 410.1 | 162.7 | 276.160 | 17.134 |
| 4 | 7 | 24616 | validator | none | 0.002 | 56.106 | 246.1 | 0.0 | 0.011 | 0.003 |
| 4 | 8 | 24618 | validator | current-zod | 190.683 | 55.870 | 560.3 | 311.5 | 353.914 | 27.064 |
| 4 | 9 | 24620 | validator | compiled-zod | 119.359 | 56.724 | 419.4 | 171.2 | 281.272 | 17.133 |
| 4 | 10 | 24640 | validator | zod-manual-normalizer | 173.606 | 55.020 | 522.9 | 275.2 | 466.078 | 27.525 |
| 5 | 1 | 24643 | validator | ajv | 61.703 | 56.027 | 365.9 | 101.6 | 164.025 | 8.615 |
| 5 | 2 | 24646 | validator | typebox | 78.828 | 56.181 | 373.6 | 104.3 | 180.880 | 10.275 |
| 5 | 3 | 24666 | validator | typebox-native-transform | 2587.073 | 55.901 | 822.6 | 546.3 | 3301.445 | 120.567 |
| 5 | 4 | 24725 | validator | valibot | 133.564 | 59.438 | 534.1 | 285.9 | 263.324 | 21.470 |
| 5 | 5 | 24727 | validator | valibot-native-transform | 158.211 | 56.821 | 407.5 | 159.6 | 269.054 | 15.209 |
| 5 | 6 | 24747 | validator | none | 0.003 | 58.325 | 246.8 | 0.0 | 0.014 | 0.002 |
| 5 | 7 | 24749 | validator | current-zod | 190.048 | 56.767 | 561.1 | 313.5 | 358.492 | 26.713 |
| 5 | 8 | 24751 | validator | compiled-zod | 120.573 | 56.267 | 417.8 | 171.3 | 284.386 | 16.064 |
| 5 | 9 | 24753 | validator | zod-manual-normalizer | 137.302 | 57.992 | 526.8 | 278.4 | 389.593 | 23.370 |
| 5 | 10 | 24773 | validator | compiled-zod-manual-normalizer | 64.605 | 55.355 | 375.1 | 126.9 | 168.962 | 10.293 |
| 6 | 1 | 24775 | validator | typebox | 76.484 | 56.064 | 370.7 | 104.8 | 177.809 | 9.705 |
| 6 | 2 | 24778 | validator | typebox-native-transform | 2484.426 | 57.026 | 824.4 | 548.6 | 3209.048 | 116.219 |
| 6 | 3 | 24853 | validator | valibot | 132.568 | 55.593 | 424.3 | 177.0 | 301.808 | 16.696 |
| 6 | 4 | 24855 | validator | valibot-native-transform | 160.402 | 57.863 | 409.9 | 162.3 | 278.375 | 14.592 |
| 6 | 5 | 24857 | validator | none | 0.002 | 56.612 | 247.0 | 0.0 | 0.018 | 0.002 |
| 6 | 6 | 24859 | validator | current-zod | 187.754 | 57.320 | 561.6 | 312.8 | 350.964 | 27.200 |
| 6 | 7 | 24879 | validator | compiled-zod | 118.696 | 56.652 | 419.2 | 170.5 | 278.396 | 16.436 |
| 6 | 8 | 24881 | validator | zod-manual-normalizer | 138.772 | 55.894 | 526.8 | 279.4 | 390.918 | 24.967 |
| 6 | 9 | 24883 | validator | compiled-zod-manual-normalizer | 65.380 | 57.527 | 376.1 | 128.5 | 169.311 | 11.084 |
| 6 | 10 | 24903 | validator | ajv | 60.898 | 56.853 | 366.8 | 102.2 | 163.266 | 9.273 |
| 7 | 1 | 24905 | validator | typebox-native-transform | 2524.711 | 55.874 | 830.9 | 554.7 | 3245.608 | 120.586 |
| 7 | 2 | 24964 | validator | valibot | 132.074 | 56.338 | 423.8 | 176.7 | 300.396 | 16.241 |
| 7 | 3 | 24986 | validator | valibot-native-transform | 156.340 | 58.097 | 408.8 | 161.2 | 270.466 | 15.462 |
| 7 | 4 | 24988 | validator | none | 0.002 | 56.462 | 247.9 | 0.0 | 0.012 | 0.005 |
| 7 | 5 | 24990 | validator | current-zod | 191.107 | 56.030 | 560.6 | 313.4 | 364.197 | 27.131 |
| 7 | 6 | 24992 | validator | compiled-zod | 119.464 | 59.822 | 418.7 | 170.5 | 283.194 | 16.731 |
| 7 | 7 | 25012 | validator | zod-manual-normalizer | 133.692 | 55.690 | 523.4 | 277.6 | 378.462 | 23.646 |
| 7 | 8 | 25014 | validator | compiled-zod-manual-normalizer | 102.253 | 55.192 | 373.1 | 126.9 | 202.275 | 12.615 |
| 7 | 9 | 25017 | validator | ajv | 62.201 | 56.512 | 365.3 | 100.3 | 166.030 | 8.312 |
| 7 | 10 | 25037 | validator | typebox | 74.744 | 59.792 | 429.3 | 161.1 | 156.884 | 11.517 |
| 8 | 1 | 25039 | validator | valibot | 132.713 | 56.073 | 423.9 | 176.4 | 299.360 | 17.482 |
| 8 | 2 | 25041 | validator | valibot-native-transform | 162.227 | 56.837 | 522.5 | 274.0 | 223.624 | 22.172 |
| 8 | 3 | 25061 | validator | none | 0.003 | 56.596 | 247.4 | 0.0 | 0.011 | 0.002 |
| 8 | 4 | 25063 | validator | current-zod | 214.020 | 57.279 | 560.0 | 311.5 | 368.010 | 30.449 |
| 8 | 5 | 25065 | validator | compiled-zod | 118.561 | 58.276 | 418.8 | 170.3 | 281.915 | 15.803 |
| 8 | 6 | 25085 | validator | zod-manual-normalizer | 136.159 | 57.537 | 526.0 | 276.8 | 383.656 | 23.962 |
| 8 | 7 | 25087 | validator | compiled-zod-manual-normalizer | 65.653 | 55.259 | 372.3 | 125.3 | 168.949 | 10.728 |
| 8 | 8 | 25089 | validator | ajv | 61.082 | 55.996 | 366.4 | 101.8 | 164.150 | 9.065 |
| 8 | 9 | 25091 | validator | typebox | 78.366 | 56.391 | 373.2 | 105.1 | 185.754 | 10.611 |
| 8 | 10 | 25111 | validator | typebox-native-transform | 2545.790 | 56.318 | 824.8 | 548.9 | 3273.587 | 112.753 |
| 9 | 1 | 25169 | validator | valibot-native-transform | 159.168 | 55.533 | 410.5 | 161.5 | 273.493 | 15.693 |
| 9 | 2 | 25171 | validator | none | 0.003 | 58.268 | 246.6 | 0.0 | 0.011 | 0.005 |
| 9 | 3 | 25173 | validator | current-zod | 193.502 | 58.070 | 558.4 | 311.7 | 366.555 | 26.987 |
| 9 | 4 | 25193 | validator | compiled-zod | 119.371 | 55.800 | 418.3 | 170.7 | 283.074 | 16.468 |
| 9 | 5 | 25195 | validator | zod-manual-normalizer | 136.300 | 57.145 | 530.7 | 282.6 | 392.128 | 23.742 |
| 9 | 6 | 25197 | validator | compiled-zod-manual-normalizer | 65.483 | 57.493 | 373.5 | 126.3 | 168.204 | 10.873 |
| 9 | 7 | 25217 | validator | ajv | 61.087 | 55.914 | 367.9 | 103.3 | 163.871 | 9.035 |
| 9 | 8 | 25219 | validator | typebox | 78.184 | 57.783 | 372.3 | 104.9 | 185.667 | 10.360 |
| 9 | 9 | 25221 | validator | typebox-native-transform | 2526.204 | 56.231 | 823.9 | 550.4 | 3264.238 | 118.764 |
| 9 | 10 | 25298 | validator | valibot | 130.492 | 55.889 | 423.1 | 175.2 | 298.315 | 16.468 |
| 10 | 1 | 25300 | validator | none | 0.002 | 56.153 | 247.1 | 0.0 | 0.013 | 0.005 |
| 10 | 2 | 25303 | validator | current-zod | 192.451 | 57.255 | 558.3 | 309.8 | 355.014 | 25.940 |
| 10 | 3 | 25306 | validator | compiled-zod | 119.088 | 58.276 | 417.6 | 168.6 | 281.304 | 16.128 |
| 10 | 4 | 25327 | validator | zod-manual-normalizer | 137.761 | 55.804 | 531.5 | 283.6 | 399.287 | 25.130 |
| 10 | 5 | 25329 | validator | compiled-zod-manual-normalizer | 64.665 | 57.009 | 375.3 | 126.8 | 169.123 | 10.570 |
| 10 | 6 | 25331 | validator | ajv | 62.634 | 55.640 | 363.3 | 99.7 | 158.270 | 10.010 |
| 10 | 7 | 25351 | validator | typebox | 77.254 | 55.738 | 369.4 | 103.2 | 176.815 | 9.899 |
| 10 | 8 | 25353 | validator | typebox-native-transform | 2552.349 | 55.781 | 829.1 | 552.6 | 3300.775 | 120.081 |
| 10 | 9 | 25411 | validator | valibot | 128.901 | 55.611 | 424.5 | 176.3 | 295.933 | 16.393 |
| 10 | 10 | 25431 | validator | valibot-native-transform | 156.030 | 57.182 | 408.5 | 160.6 | 260.987 | 15.746 |
