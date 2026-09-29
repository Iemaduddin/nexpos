<?php

test('guests are sent to login from home', function () {
    $response = $this->get(route('home'));

    $response->assertRedirect(route('login'));
});
