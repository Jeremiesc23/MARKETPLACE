"use client";

import { useState } from "react";

export default function LogoutPage() {
  const [msg, setMsg] = useState("");

  async function doLogout() {
    setMsg("");
    const res = await fetch("/api/auth/logout", { method: "POST" });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      setMsg(data.message ?? "Error cerrando sesión");
      return;
    }

    window.location.href = "/login";
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1>Logout</h1>
      <button onClick={doLogout}>Cerrar sesión</button>
      {msg && <p style={{ color: "crimson" }}>{msg}</p>}
    </main>
  );
}
