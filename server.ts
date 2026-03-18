import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data.json");

// Initial data structure
const INITIAL_DATA = {
  courses: [
    {
      id: '1',
      category: '內部實體',
      name: '食品安全衛生教育訓練',
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      time: '14:00 - 16:00',
      location: '總部大樓 3F 會議室',
      description: '年度食品安全衛生教育訓練，所有生產線同仁必修。',
      status: 'active'
    },
    {
      id: '2',
      category: '外部線上',
      name: 'ESG 企業永續發展實務',
      startDate: '2026-04-15',
      endDate: '2026-04-15',
      time: '10:00 - 12:00',
      location: '線上會議 (Teams)',
      link: 'https://teams.microsoft.com/l/meetup-join/...',
      description: '邀請外部講師分享 ESG 實務案例。',
      status: 'active'
    }
  ],
  registrations: [
    {
      id: 'r1',
      courseId: '1',
      employeeId: 'EMP001',
      employeeName: '王小明',
      registrationDate: '2026-03-16'
    }
  ],
  records: [
    {
      id: 'tr1',
      courseName: '新進員工訓練',
      employeeId: 'EMP001',
      employeeName: '王小明',
      completionDate: '2025-12-01',
      hours: 8
    }
  ]
};

async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create it with initial data
    await saveData(INITIAL_DATA);
    return INITIAL_DATA;
  }
}

async function saveData(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });
  const PORT = 3000;

  // Load initial data
  let appData = await loadData();

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.IO logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Send initial state to the newly connected client
    socket.emit("initialState", appData);

    // Handle adding a course
    socket.on("addCourse", async (course) => {
      appData.courses.push(course);
      await saveData(appData);
      io.emit("courseAdded", course);
    });

    // Handle toggling course status
    socket.on("toggleCourseStatus", async (courseId) => {
      appData.courses = appData.courses.map((c: any) => 
        c.id === courseId ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c
      );
      await saveData(appData);
      io.emit("courseStatusToggled", courseId);
    });

    // Handle registration
    socket.on("addRegistration", async (registration) => {
      appData.registrations.push(registration);
      await saveData(appData);
      io.emit("registrationAdded", registration);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
