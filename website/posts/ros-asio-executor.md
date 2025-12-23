---
title: The ROS 2 asio executor
date: 2025-12-21
excerpt:
tags: ROS 2, Executors
---

# Async tasks with ROS 2:

## The Problem

When using a single-threaded executor, our callbacks block the executor thread until the callback finishes. But what if a callback takes a long time?

In general, callbacks should be short, but sometimes we may encounter cases where they are not. What should we do then? One option is to use a multi-threaded executor or spawn a separate thread or task to run the long operation in the background and exit the callback early. This approach may sound like an efficient solution.

But do we really need to use many threads? Adding threads introduces additional points of failure. Multithreading is hard, and we can get ourselves into trouble very quickly.

So what is the alternative? One might ask: why not use Asio and coroutines? But then someone could ask, don’t we need another thread to run the io_context loop? Actually, we don’t. We can create our own Asio executor.

## The Asio Executor

The `AsioSingleThreadedExecutor` integrates Boost.Asio with ROS2:

```cpp
void spin() {
  while (rclcpp::ok(context_) && spinning.load()) {
    rclcpp::AnyExecutable any_executable;
    if (get_next_executable(any_executable, std::chrono::milliseconds(0))) {
      execute_any_executable(any_executable);
    }

    io_context_.poll();
  }
}
```

The loop alternates between ROS2 work and Asio work. Both non-blocking. One thread.


## The Example

We can consider a long-running service callback and simulate some I/O by waiting for 10 seconds. With a single-threaded executor, we would be stuck in this callback for the entire 10 seconds. However, with an Asio executor, we can simply `co_await` and return execution to the main thread. This way, we can handle other callbacks while waiting for the long operation to complete.


```cpp
service_ = create_service<std_srvs::srv::Trigger>("task",
  [this] (auto service_handle, auto request_header, auto) {
    boost::asio::co_spawn(io_context_,
      [this, service_handle, request_header]() -> boost::asio::awaitable<void> {

        // Suspend 10 seconds; executor keeps running other work!
        boost::asio::steady_timer timer(io_context_, 10s);
        co_await timer.async_wait(boost::asio::use_awaitable);

        auto response = std::make_shared<std_srvs::srv::Trigger::Response>();
        response->success = true;
        service_handle->send_response(*request_header, *response);
      },
      boost::asio::detached);
  });
```

The full example can be checked here:
* [ros2_asio_executor](https://github.com/Wiktor-99/ros2_asio_executor/)




*Disclaimer: You need to use C++23 and Asio (Boost or standalone).*
