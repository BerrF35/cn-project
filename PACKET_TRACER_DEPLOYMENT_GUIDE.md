# Cisco Packet Tracer Deployment & Setup Guide

This guide provides exact, step-by-step instructions to recreate the complete **NetScope Enterprise 10-VLAN Architecture** in **Cisco Packet Tracer**.

All scripts are pre-formatted for direct copy-pasting into the Cisco Packet Tracer CLI.

---

## 1. Required Devices in Cisco Packet Tracer

Open Cisco Packet Tracer and drag the following devices onto your workspace:

1. **1× Multilayer Switch 3560-24PS** (or 3650) → Label as `CORE-SW-01`
2. **3× Switch 2960-24TT** → Label as:
   - `ACC-SW-A` (Building 1 - HR & Finance)
   - `ACC-SW-B` (Building 2 - Engineering & Production)
   - `ACC-SW-C` (Building 3 - Corporate & Data Center)
3. **1× Router 2911** (or 2901) → Label as `EDGE-ROUTER-01`
4. **End Devices (PCs & Servers)**:
   - 2× PC for HR (`HR-PC-01`, `HR-PC-02`)
   - 2× PC for Finance (`FIN-PC-01`, `FIN-PC-02`)
   - 2× PC for Engineering (`ENG-CAD-01`, `ENG-DEV-02`)
   - 2× PC for Production (`PROD-SCADA-01`, `PROD-PLC-02`)
   - 1× Laptop for Staff (`STAFF-LAPTOP-01`)
   - 3× Servers (`SRV-DC-DHCP`, `SRV-DNS-AUTH`, `SRV-ERP-INTERNAL`)
   - 1× Server for DMZ (`DMZ-WEB-PUBLIC`)

---

## 2. Cable Wiring Map (Port-to-Port Connections)

Use **Copper Straight-Through Cables** (solid black line) for all connections:

### A. Core Switch Uplinks (Catalyst 3560)
| From Device & Port | To Device & Port | Cable Type | Role |
|:---|:---|:---|:---|
| `CORE-SW-01` **GigabitEthernet0/1** | `ACC-SW-A` **GigabitEthernet0/1** | Copper Straight-Through | 802.1Q Trunk Uplink (Bldg 1) |
| `CORE-SW-01` **GigabitEthernet0/2** | `ACC-SW-B` **GigabitEthernet0/1** | Copper Straight-Through | 802.1Q Trunk Uplink (Bldg 2) |
| `CORE-SW-01` **GigabitEthernet0/3** | `ACC-SW-C` **GigabitEthernet0/1** | Copper Straight-Through | 802.1Q Trunk Uplink (Bldg 3) |
| `CORE-SW-01` **GigabitEthernet0/24** | `EDGE-ROUTER-01` **GigabitEthernet0/0** | Copper Straight-Through | Routed Transit Link (10.20.254.0/30) |

### B. Access Switch A (Building 1 - HR & Finance)
| Switch Port | Connected Device | Device Interface | VLAN |
|:---|:---|:---|:---|
| `ACC-SW-A` **FastEthernet0/2** | `HR-PC-01` | FastEthernet0 | VLAN 20 (HR) |
| `ACC-SW-A` **FastEthernet0/3** | `HR-PC-02` | FastEthernet0 | VLAN 20 (HR) |
| `ACC-SW-A` **FastEthernet0/4** | `FIN-PC-01` | FastEthernet0 | VLAN 30 (Finance) |
| `ACC-SW-A` **FastEthernet0/5** | `FIN-PC-02` | FastEthernet0 | VLAN 30 (Finance) |

### C. Access Switch B (Building 2 - Engineering & Production)
| Switch Port | Connected Device | Device Interface | VLAN |
|:---|:---|:---|:---|
| `ACC-SW-B` **FastEthernet0/2** | `ENG-CAD-01` | FastEthernet0 | VLAN 40 (R&D) |
| `ACC-SW-B` **FastEthernet0/3** | `ENG-DEV-02` | FastEthernet0 | VLAN 40 (R&D) |
| `ACC-SW-B` **FastEthernet0/4** | `PROD-SCADA-01` | FastEthernet0 | VLAN 50 (Production) |
| `ACC-SW-B` **FastEthernet0/5** | `PROD-PLC-02` | FastEthernet0 | VLAN 50 (Production) |

### D. Access Switch C (Building 3 - Staff & DC Servers)
| Switch Port | Connected Device | Device Interface | VLAN |
|:---|:---|:---|:---|
| `ACC-SW-C` **FastEthernet0/1** | `STAFF-LAPTOP-01` | FastEthernet0 | VLAN 60 (Staff) |
| `ACC-SW-C` **FastEthernet0/4** | `SRV-DC-DHCP` | FastEthernet0 | VLAN 80 (Servers) |
| `ACC-SW-C` **FastEthernet0/5** | `SRV-DNS-AUTH` | FastEthernet0 | VLAN 80 (Servers) |
| `ACC-SW-C` **FastEthernet0/6** | `SRV-ERP-INTERNAL` | FastEthernet0 | VLAN 80 (Servers) |

### E. Edge Router DMZ Port
| Router Port | Connected Device | Device Interface | VLAN |
|:---|:---|:---|:---|
| `EDGE-ROUTER-01` **GigabitEthernet0/2** | `DMZ-WEB-PUBLIC` | FastEthernet0 | VLAN 100 (DMZ) |

---

## 3. Where & How to Paste the Scripts

Each script is located in the `packet-tracer-scripts/` directory in this workspace:

1. **[`01_CORE_MULTILAYER_SWITCH_3560.txt`](file:///c:/Users/Admin/Desktop/cnproject/packet-tracer-scripts/01_CORE_MULTILAYER_SWITCH_3560.txt)**
2. **[`02_ACCESS_SWITCH_A_BUILDING_1.txt`](file:///c:/Users/Admin/Desktop/cnproject/packet-tracer-scripts/02_ACCESS_SWITCH_A_BUILDING_1.txt)**
3. **[`03_ACCESS_SWITCH_B_BUILDING_2.txt`](file:///c:/Users/Admin/Desktop/cnproject/packet-tracer-scripts/03_ACCESS_SWITCH_B_BUILDING_2.txt)**
4. **[`04_ACCESS_SWITCH_C_BUILDING_3.txt`](file:///c:/Users/Admin/Desktop/cnproject/packet-tracer-scripts/04_ACCESS_SWITCH_C_BUILDING_3.txt)**
5. **[`05_EDGE_ROUTER_OR_FIREWALL.txt`](file:///c:/Users/Admin/Desktop/cnproject/packet-tracer-scripts/05_EDGE_ROUTER_OR_FIREWALL.txt)**
6. **[`06_PC_AND_SERVER_IP_TABLE.txt`](file:///c:/Users/Admin/Desktop/cnproject/packet-tracer-scripts/06_PC_AND_SERVER_IP_TABLE.txt)**

### The 4-Step Pasting Process in Packet Tracer:
1. **Click on the target device** (e.g. `CORE-SW-01`).
2. A window opens with tabs (`Physical`, `Config`, `CLI`). Click the **"CLI"** tab.
3. If Packet Tracer prompts: `Would you like to enter the initial configuration dialog? [yes/no]:`, type `no` and press Enter.
4. Press Enter until you see `Switch>` or `Router>`. Then type:
   ```text
   enable
   configure terminal
   ```
5. **Click the "Paste" button** on the bottom-right corner of the CLI window (or right-click → Paste).
6. Press Enter once. You will see the commands execute and write to NVRAM (`[OK]`).

Repeat this for each switch and router using their respective script file!

---

## 4. Configuring PCs & Servers in Packet Tracer

For each PC and Server, open the device:
1. Click the **Desktop** tab at the top.
2. Click **IP Configuration**.
3. Select **Static** and enter the values from [`06_PC_AND_SERVER_IP_TABLE.txt`](file:///c:/Users/Admin/Desktop/cnproject/packet-tracer-scripts/06_PC_AND_SERVER_IP_TABLE.txt).

### Quick Example: HR-PC-01
- **IP Address:** `10.20.20.10`
- **Subnet Mask:** `255.255.255.0`
- **Default Gateway:** `10.20.20.1`
- **DNS Server:** `10.20.80.11`

### Quick Example: ENG-CAD-01 (R&D)
- **IP Address:** `10.20.40.10`
- **Subnet Mask:** `255.255.254.0` *(Notice the /23 Subnet Mask!)*
- **Default Gateway:** `10.20.40.1`
- **DNS Server:** `10.20.80.11`

---

## 5. Verification Commands in Packet Tracer

Once pasted, open the CLI on any switch or PC command prompt to verify:

### On CORE-SW-01:
```text
show ip route
```
*(Confirms that all 10 departmental SVIs are directly connected and default route 0.0.0.0/0 points to 10.20.254.1).*

### On ACC-SW-A:
```text
show vlan brief
```
*(Confirms ports Fa0/2-3 are in VLAN 20, Fa0/4-5 are in VLAN 30, and Gi0/1 is trunking).*

### On HR-PC-01 (Command Prompt):
```text
ping 10.20.20.1
```
*(Verifies local SVI gateway connectivity).*

```text
ping 10.20.30.10
```
*(Verifies Layer 3 cross-VLAN routing across 802.1Q trunks from HR to Finance).*

```text
ping 10.20.80.12
```
*(Verifies HR workstation reaching the internal ERP Database server).*
