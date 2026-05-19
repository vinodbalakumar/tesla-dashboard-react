import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BatteryCharging,
  CarFront,
  Fan,
  Lightbulb,
  Lock,
  LogOut,
  Radio,
  RefreshCw,
  Snowflake,
  Thermometer,
  Unlock,
  UserRound,
  Zap,
} from "lucide-react";
import { fetchStatus, fetchUser, fetchVehicle, login, sendCommand } from "./api";
import "./styles.css";

const commands = [
  { label: "Wake", subtitle: "Start session", path: "/api/tesla/wake", icon: Zap, group: "Quick Controls", primary: true },
  { label: "Flash", subtitle: "Lights", path: "/api/tesla/flash-lights", icon: Lightbulb, group: "Quick Controls" },
  { label: "Honk", subtitle: "Horn", path: "/api/tesla/honk", icon: Radio, group: "Quick Controls" },
  { label: "Frunk", subtitle: "Open front", path: "/api/tesla/frunk/open", icon: CarFront, group: "Access" },
  { label: "Trunk", subtitle: "Open rear", path: "/api/tesla/trunk/open", icon: CarFront, group: "Access" },
  { label: "Climate", subtitle: "Start", path: "/api/tesla/climate/start", icon: Fan, group: "Access" },
  { label: "Climate Off", subtitle: "Stop", path: "/api/tesla/climate/stop", icon: Snowflake, group: "Access", danger: true },
  { label: "Start", subtitle: "Charging", path: "/api/tesla/start/charging", icon: BatteryCharging, group: "Charging", primary: true },
  { label: "Stop", subtitle: "Charging", path: "/api/tesla/stop/charging", icon: BatteryCharging, group: "Charging", danger: true },
];

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("teslaToken") || "");
  const [username, setUsername] = useState(() => localStorage.getItem("teslaUsername") || "");
  const [vehicle, setVehicle] = useState(null);
  const [vehicleStatus, setVehicleStatus] = useState({});
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [busy, setBusy] = useState("");
  const [driverTemp, setDriverTemp] = useState(22);
  const [passengerTemp, setPassengerTemp] = useState(22);
  const [customCommand, setCustomCommand] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  function normalizeLockState(value) {
    if (value === true) return "Locked";
    const text = String(value ?? "").trim().toLowerCase();
    return text === "true" || text === "locked" || text === "lock" ? "Locked" : "Unlocked";
  }

  const rawLockState = pick(vehicleStatus, ["locked", "isLocked", "lockStatus", "lock_status"], false);
  const lockState = normalizeLockState(rawLockState);
  const isLocked = lockState === "Locked";

  const groupedCommands = useMemo(
    () => {
      const lockToggleCommand = {
        label: isLocked ? "Unlock" : "Lock",
        subtitle: "Doors",
        path: isLocked ? "/api/tesla/unlock" : "/api/tesla/lock",
        icon: isLocked ? Unlock : Lock,
        group: "Quick Controls",
      };

      return [commands[0], lockToggleCommand, ...commands.slice(1)].reduce((groups, command) => {
        groups[command.group] = [...(groups[command.group] || []), command];
        return groups;
      }, {});
    },
    [isLocked]
  );

  useEffect(() => {
    if (!token) return;
    refreshAll();
    if (username) {
      fetchUser(username)
        .then(setProfile)
        .catch((error) => pushActivity("Profile", error.message, true));
    }
  }, [token, username]);

  function pick(source, keys, fallback = "Not available") {
    if (!source || typeof source !== "object") return fallback;
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null && source[key] !== "") return source[key];
    }
    return fallback;
  }

  function formatValue(value) {
    if (value === null || value === undefined || value === "") return "Not available";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.length ? value.map(formatValue).join(", ") : "None";
    if (typeof value === "object") {
      return Object.entries(value)
        .slice(0, 4)
        .map(([key, next]) => `${key}: ${formatValue(next)}`)
        .join(" | ");
    }
    return String(value);
  }

  function formatActivityTitle(title) {
    return String(title || "Activity")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function activityDetails(message) {
    if (message === null || message === undefined || message === "") {
      return [{ label: "Message", value: "Not available" }];
    }

    if (typeof message === "object" && !Array.isArray(message)) {
      const source = message.response && typeof message.response === "object" ? message.response : message;
      return Object.entries(source)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .slice(0, 5)
        .map(([key, value]) => ({
          label: formatActivityTitle(key),
          value: formatValue(value),
        }));
    }

    return [{ label: "Message", value: formatValue(message) }];
  }

  function pushActivity(title, message, error = false) {
    setActivity((items) => [
      {
        title: formatActivityTitle(title),
        details: activityDetails(message),
        error,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      ...items,
    ].slice(0, 9));
  }

  async function refreshAll() {
    setBusy("refresh");
    try {
      const [nextVehicle, nextStatus] = await Promise.all([fetchVehicle(), fetchStatus()]);
      setVehicle(nextVehicle);
      setVehicleStatus(nextStatus || {});
      pushActivity("Status refreshed", nextStatus || "Vehicle synced");
    } catch (error) {
      pushActivity("Refresh", error.message, true);
    } finally {
      setBusy("");
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextUsername = String(form.get("username") || "").trim();
    setBusy("login");

    try {
      const nextToken = await login(nextUsername, form.get("password"));
      localStorage.setItem("teslaToken", nextToken);
      localStorage.setItem("teslaUsername", nextUsername);
      setToken(nextToken);
      setUsername(nextUsername);
      pushActivity("Login", "Signed in");
    } catch (error) {
      pushActivity("Login", error.message || "Login failed", true);
    } finally {
      setBusy("");
    }
  }

  async function runCommand(command, query) {
    setBusy(command.label);
    try {
      const response = await sendCommand(command.path, query);
      pushActivity(command.label, response || "Completed");
      refreshAll();
    } catch (error) {
      pushActivity(command.label, error.message || "Command failed", true);
    } finally {
      setBusy("");
    }
  }

  async function runCustomCommand() {
    const command = customCommand.trim();
    if (!command) {
      pushActivity("Own command", "Enter a Tesla command name first", true);
      return;
    }

    await runCommand(
      { label: "Own command", path: "/api/tesla/cmd" },
      { command }
    );
  }

  function logout() {
    localStorage.removeItem("teslaToken");
    localStorage.removeItem("teslaUsername");
    setToken("");
    setUsername("");
    setVehicle(null);
    setVehicleStatus({});
    setActivity([]);
    setProfile(null);
  }

  const chargeState = formatValue(pick(vehicleStatus, ["charging_state", "chargingState", "isCharging", "charging"], "Off"));
  const liveState = formatValue(pick(vehicleStatus, ["state", "vehicle_state", "vehicle"], pick(vehicle, ["state"], "Online")));
  const vin = pick(vehicle, ["vin"], "7SAYGDEE1RF129635");
  const modelName = pick(vehicle, ["display_name", "displayName", "model", "vehicle_name"], "2024 Model Y");

  if (!token) {
    return <Login busy={busy === "login"} activity={activity} onSubmit={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Vinod Tesla</div>
        <nav>Vehicles</nav>
        <div className="top-actions">
          <div className="profile-wrap">
            <button className="profile-button" onClick={() => setShowProfile((value) => !value)}>
              <UserRound size={17} />
              <span>Profile</span>
            </button>
            {showProfile && (
              <section className="profile-card">
                <h3>Profile</h3>
                <ProfileRow label="User name" value={profile?.username || username} />
                <ProfileRow label="Email" value={profile?.email || "Not available"} />
                <ProfileRow label="Created date" value={profile?.createdDate || profile?.createdAt || "Not available"} />
              </section>
            )}
          </div>
          <button className="logout-button" onClick={logout}>
            <LogOut size={17} />
            <span>Logout</span>
          </button>
          <strong className="username">{username}</strong>
        </div>
      </header>

      <main className="dashboard">
        <section className="vehicle-column">
          <p className="eyebrow">Premium electric vehicle</p>
          <h1>{modelName}</h1>
          <p className="vin">VIN {vin}</p>
          <button className="details-link" onClick={() => setShowDetails((value) => !value)}>Details</button>
          <div className="vehicle-image">
            <img src={`${import.meta.env.BASE_URL}tesla-style-car.png`} alt="White Tesla Model Y" />
          </div>
          <div className="mini-grid">
            <Stat label="Vehicle" value="Model Y" />
            <Stat label="Drive" value="AWD" />
            <Stat label="Mode" value={liveState} />
          </div>
          {showDetails && (
            <section className="details-panel">
              <h2>Vehicle Details</h2>
              <div className="details-grid">
                <ProfileRow label="Model" value={modelName} />
                <ProfileRow label="VIN" value={vin} />
                <ProfileRow label="State" value={liveState} />
                <ProfileRow label="Vehicle ID" value={pick(vehicle, ["id", "vehicle_id", "vehicleId"])} />
              </div>
            </section>
          )}
        </section>

        <section className="control-surface">
          <div className="status-grid">
            <Stat label="Vehicle" value={liveState} />
            <Stat label="Security" value={lockState} />
            <Stat label="Charging" value={chargeState} />
          </div>

          {Object.entries(groupedCommands).map(([group, items]) => (
            <section className="control-section" key={group}>
              <div className="section-heading">
                <h2>{group}</h2>
                <span>{group === "Charging" ? "Battery controls" : group === "Access" ? "Trunks and cabin" : "Mobile app style"}</span>
              </div>
              <div className="control-grid">
                {items.map((command) => {
                  const Icon = command.icon;
                  return (
                    <button
                      className={`control-button ${command.primary ? "primary-action" : ""} ${command.danger ? "danger-action" : ""}`}
                      disabled={Boolean(busy)}
                      key={`${group}-${command.label}`}
                      onClick={() => runCommand(command)}
                    >
                      <Icon size={22} />
                      <strong>{busy === command.label ? "Sending..." : command.label}</strong>
                      <span>{command.subtitle}</span>
                    </button>
                  );
                })}
                {group === "Charging" && (
                  <button className="control-button" disabled={Boolean(busy)} onClick={refreshAll}>
                    <RefreshCw size={22} />
                    <strong>Refresh</strong>
                    <span>Status</span>
                  </button>
                )}
              </div>
            </section>
          ))}

          <section className="control-section">
            <div className="section-heading">
              <h2>Climate Temperature</h2>
              <span>Cabin comfort</span>
            </div>
            <div className="temp-grid">
              <TempControl label="Driver Temp" value={driverTemp} setValue={setDriverTemp} onSubmit={() => runCommand({ label: "Driver temperature", path: "/api/tesla/set/driverTemperature" }, { driverTemp })} />
              <TempControl label="Passenger Temp" value={passengerTemp} setValue={setPassengerTemp} onSubmit={() => runCommand({ label: "Passenger temperature", path: "/api/tesla/set/passengerTemperature" }, { passengerTemperature: passengerTemp })} />
            </div>
          </section>

          <section className="control-section">
            <div className="section-heading">
              <h2>Run Own Command</h2>
              <span>Advanced Tesla command</span>
            </div>
            <div className="custom-command-card">
              <label>
                Command name
                <div className="custom-command-row">
                  <input
                    value={customCommand}
                    onChange={(event) => setCustomCommand(event.target.value)}
                    placeholder="Example: wake_up"
                  />
                  <button type="button" disabled={Boolean(busy)} onClick={runCustomCommand}>
                    Run
                  </button>
                </div>
              </label>
            </div>
          </section>

          <section className="control-section">
            <div className="section-heading">
              <h2>Activity Status</h2>
              <button className="clear-button" onClick={() => setActivity([])}>Clear</button>
            </div>
            <div className="activity-grid">
              {activity.length ? activity.map((item, index) => <ActivityCard key={`${item.title}-${index}`} {...item} />) : <ActivityCard title="Ready" message="No recent activity" />}
            </div>
          </section>
        </section>
      </main>

      <footer>
        <span>Vinod Balakumar</span>
        <a href="#">Privacy &amp; Legal</a>
        <span>Product by Vinod Balakumar  || © 2026 Vinod Balakumar</span>
      </footer>
    </div>
  );
}

function Login({ busy, activity, onSubmit }) {
  const lastError = activity.find((item) => item.error);
  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand">Vinod Tesla</div>
        <h1>Sign in</h1>
        <p>Manage your Model Y controls, vehicle status, and profile from one modern dashboard.</p>
        <form onSubmit={onSubmit}>
          <label>
            Username
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="primary-button" disabled={busy}>{busy ? "Signing in..." : "Continue"}</button>
        </form>
        <p className="form-status">{lastError?.message || ""}</p>
      </section>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="profile-row">
      <span>{label}</span>
      <strong>{String(value ?? "Not available")}</strong>
    </div>
  );
}

function TempControl({ label, value, setValue, onSubmit }) {
  return (
    <div className="temp-card">
      <label>
        {label}
        <div className="temp-row">
          <Thermometer size={18} />
          <input type="number" min="15" max="30" value={value} onChange={(event) => setValue(event.target.value)} />
          <button onClick={onSubmit} type="button">Set</button>
        </div>
      </label>
    </div>
  );
}

function ActivityCard({ title, message, details, error, time }) {
  const rows = details?.length ? details : [{ label: "Message", value: message || "No recent activity" }];

  return (
    <div className={`activity-card ${error ? "error" : ""}`}>
      <div className="activity-card-head">
        <span>{title}</span>
        {time && <time>{time}</time>}
      </div>
      <dl>
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
