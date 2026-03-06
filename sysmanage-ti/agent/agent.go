package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"time"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

type Metrics struct {
	AgentID  string  `json:"agent_id"`
	CPU      float64 `json:"cpu"`
	RAM      float64 `json:"ram"`
	Disk     float64 `json:"disk"`
	Network  float64 `json:"network"`
	Hostname string  `json:"hostname"`
}

func main() {
	agentID := getHostname()
	for {
		cpuPercent, _ := cpu.Percent(0, false)
		memInfo, _ := mem.VirtualMemory()
		data := Metrics{
			AgentID:  agentID,
			CPU:      cpuPercent[0],
			RAM:      memInfo.UsedPercent,
			Disk:     50,
			Network:  10,
			Hostname: agentID,
		}
		jsonData, _ := json.Marshal(data)
		http.Post("http:///api/agent/metrics", "application/json", bytes.NewBuffer(jsonData))
		time.Sleep(5 * time.Second)
	}
}

func getHostname() string {
	name, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return name
}