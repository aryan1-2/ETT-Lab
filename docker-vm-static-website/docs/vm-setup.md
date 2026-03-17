# Virtual Machine Setup

This project uses an Ubuntu Server virtual machine as the main infrastructure environment.

## Virtual Machine Configuration

Host System: Windows Laptop

Hypervisor:
VirtualBox

Guest OS:
Ubuntu Server

## Steps

1 Install VirtualBox

Download VirtualBox from the official website.

2 Create a new VM

Select:
Linux → Ubuntu

Recommended Configuration

RAM:
4GB

CPU:
2 Cores

Disk:
20GB

3 Install Ubuntu Server

Boot using Ubuntu ISO image and complete installation.

4 Enable SSH

SSH allows remote access to the VM.

Command:

sudo apt install openssh-server

Verify:

sudo systemctl status ssh