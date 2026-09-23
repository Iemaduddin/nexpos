<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Demo Data Volume
    |--------------------------------------------------------------------------
    |
    | Controls how much historical data HistorySeeder generates. Override
    | with SEED_HISTORY_DAYS and SEED_SALES_PER_DAY ("min-max") in .env.
    |
    */

    'history_days' => (int) env('SEED_HISTORY_DAYS', 90),
    'sales_per_day' => (string) env('SEED_SALES_PER_DAY', '8-12'),

];
