---
title: The ROS 2 unexpected crashes management
date: 2025-11-22
excerpt:
tags: ROS 2, Launch system
---

Managing a large scale ROS system might be difficult, especially when running dozens or hundreds of processes, each representing nodes or groups of nodes via composition.
What happens if one of these nodes crashes? How do we notify the rest of the system? Should we create a list of processes or nodes and periodically check their presence?

That might sound like a good idea, but then we must maintain and constantly update such a list. It’s easy to forget to add a new process, which would cause the entire approach to fall apart.

To address this problem, we can take advantage of ROS 2 Launch’s event mechanism.
This mechanism allows us to register an event handler that executes an action, in our case, a custom callback.
Such an event handler can be added to our top-level launch file, which is responsible for system startup.

The full solution is straightforward:

```
from launch import LaunchDescription
from launch.actions import RegisterEventHandler, OpaqueFunction
from launch.event_handlers import OnProcessExit
from launch_ros.actions import Node
import rclpy
from rclpy.node import Node as RclpyNode
from std_msgs.msg import String
import json


class DeathPublisher:
    def __init__(self):
        if not rclpy.ok():
            rclpy.init()
        self._node = RclpyNode('process_monitor')
        self._publisher = self._node.create_publisher(String, '/dead_process', 10)

    def publish_death(self, process_name, exit_code):
        clean_name = process_name.rsplit("-", 1)[0] if "-" in process_name else process_name

        msg = String()
        msg.data = json.dumps({
            'process_name': clean_name,
            'exit_code': exit_code
        })

        self._node.get_logger().warn(
            f'Process died: {clean_name} (exit code: {exit_code})'
        )
        try:
            self._publisher.publish(msg)
        except Exception as e:
            self._node.get_logger().warn(
                f'Failed to publish info about process that just died. {e}'
            )



def generate_launch_description():
    publisher = DeathPublisher()

    def handle_exit(event, context):
        process_name = event.action.process_details.get('name', 'unknown')
        exit_code = event.returncode
        publisher.publish_death(process_name, exit_code)

    talker_node = Node(
        package='demo_nodes_cpp',
        executable='talker',
        name='talker',
        respawn=True,
        output='screen'
    )

    exit_handler = RegisterEventHandler(
        OnProcessExit(
            on_exit=handle_exit
        )
    )

    return LaunchDescription([
        talker_node,
        exit_handler
    ])
```


Let’s break it down into parts.
First, we create a simple node that publishes information about processes that have died so that the rest of the system can react.
We should publish the process name along with its return code so that we can determine whether the process finished cleanly or terminated unexpectedly.
A subscriber can then collect this data, forward it to the cloud, or do anything else we need.

```
class DeathPublisher:
    def __init__(self):
        if not rclpy.ok():
            rclpy.init()
        self._node = RclpyNode('process_monitor')
        self._publisher = self._node.create_publisher(String, '/dead_process', 10)

    def publish_death(self, process_name, exit_code):
        clean_name = process_name.rsplit("-", 1)[0] if "-" in process_name else process_name

        msg = String()
        msg.data = json.dumps({
            'process_name': clean_name,
            'exit_code': exit_code
        })

        self._node.get_logger().warn(
            f'Process died: {clean_name} (exit code: {exit_code})'
        )
        try:
            self._publisher.publish(msg)
        except Exception as e:
            self._node.get_logger().warn(
                f'Failed to publish info about process that just died. {e}'
            )

```

The second part is the body of `generate_launch_description()`. Here we define our custom callback, which publishes information about the process that has exited along with its return code.

```
def generate_launch_description():
    publisher = DeathPublisher()

    def handle_exit(event, context):
        process_name = event.action.process_details.get('name', 'unknown')
        exit_code = event.returncode
        publisher.publish_death(process_name, exit_code)

    talker_node = Node(
        package='demo_nodes_cpp',
        executable='talker',
        name='talker',
        respawn=True,
        output='screen'
    )

    exit_handler = RegisterEventHandler(
        OnProcessExit(
            on_exit=handle_exit
        )
    )

    return LaunchDescription([
        talker_node,
        exit_handler
    ])
```

This simple technique allows us to monitor all processes run by the launch system and track down problematic nodes.