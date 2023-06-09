import { useEffect, useState, useMemo } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import DayLayout from "./components/DayLayout";
import Button from "./components/Button";
import Footer from "./components/Footer";
import About from "./components/About";
import LogIn from "./components/LogIn";
import History from "./components/History";
import Register from "./components/Register";
import axios from "axios";
import { UserContext } from "./components/UserContext";
import ProtectedRoutes from "./components/ProtectedRoutes";
import NavBar from "./components/NavBar";

function App() {
  const [showAddTask, setShowAddTask] = useState(false);
  const [showOtherDays, setShowOtherDays] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [showDone, setShowDone] = useState();
  const [user, setUser] = useState(null);
  const [nuffSpace, setNuffSpace] = useState(false);
  const APP_API_URL = process.env.REACT_APP_API_URL;

  const providerUser = useMemo(
    () => ({ user, setUser, tasks, setTasks, APP_API_URL }),
    [user, setUser, tasks, setTasks, APP_API_URL]
  );

  useEffect(() => {
    const queryTasks = async () => {
      if (sessionStorage.getItem("doMeToken")) {
        const dataFromServer = await getTasks();
        setTasks(dataFromServer.tasks);
        setUser(dataFromServer.user);
        setShowDone(!!dataFromServer.showDone);
      }
    };

    const handleResize = () => {
      const winWidth = window.innerWidth;
      if (winWidth < 1080) {
        setNuffSpace(false);
        setShowOtherDays(false);
      } else {
        setNuffSpace(true);
      }
    };

    window.addEventListener("resize", handleResize);

    queryTasks();
    handleResize();
  }, []);

  const getTasks = async () => {
    if (sessionStorage.getItem("doMeToken")) {
      let head = {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("doMeToken")}`,
        },
      };
      let payload = { type: "load", userId: sessionStorage.getItem("id") };
      let response;
      try {
        response = await axios.post(`${APP_API_URL}/tasks`, payload, head);
      } catch (e) {
        console.error(e);
        sessionStorage.removeItem("doMeToken");
        setUser(false);
        window.location.reload();
      }
      console.log("SUCCESS", response.data);
      return response.data;
    } else {
      return;
    }
  };

  //ADD TASK
  const addTask = async (task) => {
    const date = new Date();
    console.log(date);
    task["id"] = -1;
    const currentTasks = tasks.slice(0);
    if (task.day === "today") {
      currentTasks[1].splice(0, 0, task);
    } else {
      currentTasks[2].splice(0, 0, task);
    }
    setTasks(currentTasks);
    let payload = {
      type: "post",
      description: task.description,
      day: task.day,
      userId: sessionStorage.getItem("id"),
    };
    let head = {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("doMeToken")}`,
      },
    };
    await axios.post(`${APP_API_URL}/tasks`, payload, head);
    const dataFromServer = await getTasks();
    setTasks(dataFromServer.tasks);
  };

  // DELETE TASK
  const deleteTask = async (id, done, colId) => {
    const currentTasks = tasks.slice(0);
    currentTasks[colId - 1] = currentTasks[colId - 1].filter(
      (task) => task.id !== id || task.done !== done
    );
    setTasks(currentTasks);
    let head = {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("doMeToken")}`,
      },
    };
    let payload = { type: "delete", taskId: id, done: done };
    try {
      await axios.post(`${APP_API_URL}/tasks`, payload, head);
    } catch (e) {
      console.error(e);
      sessionStorage.removeItem("doMeToken");
      setUser(false);
      window.location.reload();
    }
  };

  // MOVE FINISHED TASKS DOWNWARDS
  const clearDone = async (id, done, colId) => {
    const currentTasks = tasks.slice(0);
    let toggledTask;
    let newIndex = currentTasks[colId - 1].length - 1;
    let found = false;
    for (const [index, task] of currentTasks[colId - 1].entries()) {
      if (task.id === id) {
        toggledTask = task;
      }
      // console.log(!done)
      if (task.done && !found) {
        if (!done) {
          newIndex = index - 1;
          found = true;
        } else {
          newIndex = index;
          found = true;
        }
      }
    }
    toggledTask.done = done ? 0 : 1;
    currentTasks[colId - 1] = currentTasks[colId - 1].filter(
      (task) => task.id !== id
    );
    currentTasks[colId - 1].splice(newIndex, 0, toggledTask);

    setTasks(currentTasks);
    let head = {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("doMeToken")}`,
      },
    };
    let payload = { type: "done", taskId: id, done: done };
    await axios.post(`${APP_API_URL}/tasks`, payload, head);
    const dataFromServer = await getTasks();
    setTasks(dataFromServer.tasks);
  };

  // PASS YESTERDAY'S UNFINISHED TASKS TO TODAY

  const passUnfinished = async () => {
    const currentTasks = tasks.slice(0);
    let pendingTasks = [];
    let doneTasks = [];
    for (const task of currentTasks[0]) {
      if (task.done) {
        doneTasks.push(task);
      } else {
        pendingTasks.push(task);
      }
    }
    currentTasks[0] = doneTasks;
    pendingTasks.reverse();
    for (const task of pendingTasks) {
      currentTasks[1].splice(0, 0, task);
    }
    setTasks(currentTasks);
    let head = {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("doMeToken")}`,
      },
    };
    let payload = { type: "pass", userId: sessionStorage.getItem("id") };
    await axios.post(`${APP_API_URL}/tasks`, payload, head);
    const dataFromServer = await getTasks();
    setTasks(dataFromServer.tasks);
  };

  // TOGGLE SHOW OTHER DAYS
  const toggleShowOtherDays = async () => {
    setShowOtherDays(!showOtherDays);
  };

  // HIDE DONE
  const hideDone = async () => {
    setShowDone(!showDone);
    let head = {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("doMeToken")}`,
      },
    };
    let payload = { type: "hideDone", userId: sessionStorage.getItem("id") };
    await axios.post(`${APP_API_URL}/tasks`, payload, head);
    const dataFromServer = await getTasks();
    setTasks(dataFromServer.tasks);
  };

  // HANDLER FOR DRAG N DROP
  const handleDrag = async (result) => {
    const { destination, source } = result;
    if (!destination) {
      return;
    }

    const sourceTask = tasks[source.droppableId - 1][source.index];
    const destinationTask =
      tasks[destination.droppableId - 1][destination.index];

    if (destinationTask) {
      if (
        sourceTask.id === destinationTask.id &&
        source.droppableId === destination.droppableId
      ) {
        return;
      }
      if (
        tasks[destination.droppableId - 1][destination.index].done &&
        source.index < destination.index &&
        source.droppableId === destination.droppableId
      ) {
        return;
      }
    }
    if (destination.index !== 0) {
      if (tasks[destination.droppableId - 1][destination.index - 1].done) {
        return;
      }
    }
    if (sourceTask.done) {
      return;
    }

    const currentTasks = tasks.slice(0);
    currentTasks[source.droppableId - 1] = currentTasks[
      source.droppableId - 1
    ].filter((task) => task.id !== sourceTask.id);
    currentTasks[destination.droppableId - 1].splice(
      destination.index,
      0,
      sourceTask
    );
    console.log(currentTasks);
    setTasks(currentTasks);

    // PREPARING DATA FOR SERVER ////////////////////////////////////////////////////

    const aboveDestContent =
      !!tasks[destination.droppableId - 1][destination.index - 1];
    const belowDestContent =
      !!tasks[destination.droppableId - 1][destination.index + 1];
    const destinationContent = !!destinationTask;
    let destinationDone;
    let destinationIndex;
    let aboveDestIndex;
    let belowDestIndex;
    let belowDestDone;
    if (destinationContent) {
      destinationDone = !!destinationTask.done;
      destinationIndex = destinationTask.display_index;
    } else {
      destinationDone = false;
      destinationIndex = null;
    }
    if (aboveDestContent) {
      aboveDestIndex =
        tasks[destination.droppableId - 1][destination.index - 1].display_index;
    } else {
      aboveDestIndex = null;
    }
    if (belowDestContent) {
      belowDestIndex =
        tasks[destination.droppableId - 1][destination.index + 1].display_index;
      belowDestDone =
        tasks[destination.droppableId - 1][destination.index + 1].done;
    } else {
      belowDestIndex = null;
      belowDestDone = null;
    }

    let head = {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("doMeToken")}`,
      },
    };
    let payload = {
      type: "dnd",
      srcId: sourceTask.id,
      sourceIndex: sourceTask.display_index,
      aboveDestContent: aboveDestContent,
      aboveDestIndex: aboveDestIndex,
      destinationContent: destinationContent,
      destinationIndex: destinationIndex,
      destinationDone: destinationDone,
      srcDay: source.droppableId,
      destDay: destination.droppableId,
      belowDestContent: belowDestContent,
      belowDestIndex: belowDestIndex,
      belowDestDone: belowDestDone,
    };
    try {
      await axios.post(`${APP_API_URL}/tasks`, payload, head);
    } catch (e) {
      console.error(e);
      sessionStorage.removeItem("doMeToken");
      setUser(false);
      window.location.reload();
    }

    const dataFromServer = await getTasks();
    setTasks(dataFromServer.tasks);
  };

  return (
    <UserContext.Provider value={providerUser}>
      <Router>
        <Routes>
          <Route element={<ProtectedRoutes />}>
            <Route
              path="/"
              excat
              element={
                <DragDropContext onDragEnd={handleDrag}>
                  <div className="fixed left-0 top-0 right-0 bottom-0 flex flex-col justify-between space-y-4 md:space-y-9 2xl:space-y-24 bg-[#F1F2F7]">
                    <NavBar />
                    <div className="flex take-remaining-h items-center justify-around h-[70%]">
                      {showOtherDays && nuffSpace ? (
                        <DayLayout
                          colId="1"
                          title="Yesterday"
                          toggleShowAdd={() => setShowAddTask(!showAddTask)}
                          showAddTask={showAddTask}
                          tasks={tasks[0]}
                          deleteTask={deleteTask}
                          clearDone={clearDone}
                          onClick={passUnfinished}
                          showDone={showDone}
                          nuffSpace={nuffSpace}
                        />
                      ) : (
                        ""
                      )}
                      <DayLayout
                        colId="2"
                        title="Today"
                        toggleShowAdd={() => setShowAddTask(!showAddTask)}
                        showAddTask={showAddTask}
                        tasks={tasks[1]}
                        deleteTask={deleteTask}
                        clearDone={clearDone}
                        onAdd={addTask}
                        onClick={hideDone}
                        showDone={showDone}
                        nuffSpace={nuffSpace}
                      />
                      {showOtherDays && nuffSpace ? (
                        <DayLayout
                          colId="3"
                          title="Tomorrow"
                          toggleShowAdd={() => setShowAddTask(!showAddTask)}
                          showAddTask={showAddTask}
                          tasks={tasks[2]}
                          deleteTask={deleteTask}
                          clearDone={clearDone}
                          showDone={showDone}
                          nuffSpace={nuffSpace}
                        />
                      ) : (
                        ""
                      )}
                    </div>
                    <div className="flex flex-col items-center justify-around h-8 md:h-28">
                      <div className="flex items-center justify-center">
                        {nuffSpace ? (
                          <Button
                            color={
                              showOtherDays
                                ? "rgb(255, 22, 93)"
                                : "rgb(97, 138, 0)"
                            }
                            text={
                              showOtherDays
                                ? "Hide Yesterday & Tomorrow"
                                : "Show Yesterday & Tomorrow"
                            }
                            onClick={toggleShowOtherDays}
                          />
                        ) : (
                          ""
                        )}
                      </div>
                      <Footer />
                    </div>
                  </div>
                </DragDropContext>
              }
            />
            <Route path="/about" element={<About />} />
            <Route path="/history" element={<History />} />
          </Route>
          <Route path="/login" element={<LogIn />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
