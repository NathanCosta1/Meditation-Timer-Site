import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eyegfymsgxghjweijako.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZWdmeW1zZ3hnaGp3ZWlqYWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1ODk1NjcsImV4cCI6MjA1MTE2NTU2N30.t0QEcyXr5N7MxGZMYQeFy4pyy5RdDmFJlwT6JqI7ttA';
const supabase = createClient(supabaseUrl, supabaseKey);

const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const durationInput = document.getElementById('duration');
const startButton = document.getElementById('startBtn');
const pauseButton = document.getElementById('pauseBtn');
const endButton = document.getElementById('endBtn');
const quitButton = document.getElementById('quitBtn');
const historyList = document.getElementById('historyList');
const timerSound = document.getElementById('timerSound');
const testButton = document.getElementById('testSoundBtn'); 
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signInButton = document.getElementById('signInBtn');
const signUpButton = document.getElementById('signUpBtn');
const logoutButton = document.getElementById('logoutBtn');
const historyTitle = document.getElementById('history-title');
const settingsBtn = document.getElementById('settingsBtn'); 
const settingsDropdown = document.getElementById('settingsDropdown'); 

let timerInterval;
let timeLeft;
let startTime;
let paused = false;
let userId; // Holds user ID when logged in
let isUserLoggedIn = false;

// This will check the supabase session when the page is loaded.
async function checkIfUserLoggedIn() {
    console.log("checkIfUserLoggedIn called");
    const { data: { user } } = await supabase.auth.getUser();
    console.log("checkIfUserLoggedIn - user:", user);
    const authFormElement = document.getElementById('auth-form');
    const logoutButtonElement = document.getElementById('logoutBtn');
    const historyTitleElement = document.getElementById('history-title');

    console.log("authFormElement:", authFormElement);
    console.log("logoutButtonElement:", logoutButtonElement);
    console.log("historyTitleElement:", historyTitleElement);

    if(user) {
        userId = user.id;
        isUserLoggedIn = true;
        if (authFormElement) authFormElement.style.display = 'none';
        if (logoutButtonElement) logoutButtonElement.style.display = 'inline';
        if (historyTitleElement) historyTitleElement.textContent = 'Session History';
        console.log("User is logged in:", userId);
        await fetchAndDisplayHistory();
    } else {
        if (historyTitleElement) historyTitleElement.textContent = 'Sign In To See History';
        isUserLoggedIn = false;
        if (logoutButtonElement) logoutButtonElement.style.display = 'none';
        if (authFormElement) authFormElement.style.display = 'flex';
        console.log("User is not logged in. (No user found)");
    }
}

async function fetchAndDisplayHistory() {
    if (userId) {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: false });

        if (error) {
            console.error("Error fetching sessions:", error); // Log the error
            alert("Failed to load session history."); // Inform the user
        } else {
            console.log("Successfully fetched sessions:", data); // Log the fetched data
            historyList.innerHTML = ''; // Clear existing history
            data.forEach(session => {
                const start = new Date(session.start_time).toLocaleTimeString();
                addSessionToHistory(start, session.duration, true);
            });
        }
    }
}

// Function to display time
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);
    minutesDisplay.textContent = String(minutes).padStart(2, '0');
    secondsDisplay.textContent = String(seconds).padStart(2, '0');
}

// Function called to start timer
async function startTimer() {
    const duration = parseFloat(durationInput.value);
    if (isNaN(duration) || duration <= 0) {
        alert("Please enter a valid duration in minutes");
        return;
    }
    timeLeft = duration * 60;
    startTime = new Date();

    updateDisplay();
    durationInput.disabled = true;
    startButton.disabled = true;
    endButton.disabled = false;
    quitButton.disabled = false;
    pauseButton.disabled = false;

    timerInterval = setInterval(() => {
        if(!paused) {
            timeLeft--;
            updateDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                playTimerSound();
                stopTimer();
            }
        }
    }, 1000);
}

// Function to pause timer
function pauseTimer(){
    paused = !paused;
}

// Function to stop timer
async function stopTimer(){
    clearInterval(timerInterval);
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    const startFormatted = startTime.toLocaleTimeString();

    console.log("stopTimer - userId before saving:", userId);

    if (isUserLoggedIn) {
        await addSessionToDatabase(duration);
        addSessionToHistory(startFormatted, duration)
    } else {
        addSessionToHistory(startFormatted, duration, false)
    }

    durationInput.disabled = false;
    startButton.disabled = false;
    endButton.disabled = true;
    quitButton.disabled = true;
    pauseButton.disabled = true;
}

// Function to reset timer
function resetTimer(){
    clearInterval(timerInterval);
    timeLeft = 0;
    updateDisplay();
    durationInput.disabled = false;
    startButton.disabled = false;
    endButton.disabled = true;
    quitButton.disabled = true;
    pauseButton.disabled = true;
}

//Function to add session to db
async function addSessionToDatabase(duration) {
    console.log("addSessionToDatabase called with duration:", duration);
    if (userId) {
        const sessionData = [{ user_id: userId, start_time: startTime, duration: duration }];
        console.log("Attempting to insert:", sessionData);
        const { data, error } = await supabase
            .from('sessions')
            .insert([{ user_id: userId, start_time: startTime, duration: duration }]);
        if (error) {
            console.error("Error inserting session:", error);
        } else {
            console.log('Session saved!', data);
        }
    } else {
        console.log("No user logged in");
    }
}

// Function to add session to the history list in html
function addSessionToHistory(start, duration, display = true) {
    const li = document.createElement('li');
    const durationMinutes = Math.floor(duration / 60);
    const durationSeconds = Math.floor(duration % 60);

    if (display) {
        li.textContent = `Started: ${start}, Duration: ${durationMinutes}m ${durationSeconds}s`;
        historyList.appendChild(li);
    }
    else {
        li.textContent = `Started: ${start}, Duration: ${durationMinutes}m ${durationSeconds}s (Not Logged In)`;
        historyList.appendChild(li);
    }
}

// Function to play the timer sound
function playTimerSound() {
    timerSound.play();
}

// Event Listeners

startButton.addEventListener('click', startTimer);
endButton.addEventListener('click', stopTimer);
quitButton.addEventListener('click', resetTimer);
pauseButton.addEventListener('click', pauseTimer);

// Supabase Auth Event Listeners
signInButton.addEventListener('click', async (e) => {
    console.log("Sign in button was pressed");
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value
    });
    if(error){
        console.error("Error Signing In", error);
        alert("Error Signing In");
    } else {
        console.log("Sign in successful", data);
        await checkIfUserLoggedIn(); // Force check after login
    }
});

signUpButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
        email: emailInput.value,
        password: passwordInput.value
    });

    if (error) {
        console.error("Error Signing Up", error);
        alert("Error Signing Up");
    } else {
        console.log("Sign up successful", data);
        alert("Check Email to Confirm Signup");
    }
});

logoutButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signOut();
});

// This will trigger when the auth state changes (eg. login or logout)
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("auth state changed with event:", event, "and session:", session);
    setTimeout(async () => {
        await checkIfUserLoggedIn();
    }, 100); // A delay of 100 milliseconds
});

document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && isUserLoggedIn) {
        console.log("Tab became visible, refetching history");
        await fetchAndDisplayHistory();
    }
});

// Settings button functionality
settingsBtn.addEventListener('click', () => {
    settingsDropdown.style.display = settingsDropdown.style.display === 'block' ? 'none' : 'block';
});

// Close the dropdown if the user clicks outside of it
window.addEventListener('click', (event) => {
    if (!event.target.matches('#settingsBtn')) {
        if (settingsDropdown.style.display === 'block') {
            settingsDropdown.style.display = 'none';
        }
    }
});

// Event listener for the Test Sound button (now in the dropdown)
testButton.addEventListener('click', playTimerSound);

// Check if user is already signed in, on page load
checkIfUserLoggedIn();