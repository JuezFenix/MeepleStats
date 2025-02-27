import { Box, Button, Group, LoadingOverlay, TextInput, Textarea, Select, Checkbox, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
//import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router";
import { PillsInput, Pill, Combobox, CheckIcon, useCombobox } from "@mantine/core";
import { Game, Player } from "../model/Interfaces";
import { API_URL, JWT_STORAGE } from "../model/Constants";


const LogMatch = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const form = useForm({
    initialValues: {
      game: "",
      game_id: "",
      note: "",
      date: new Date().toISOString().split("T")[0],
      image: null as File | null,
      players: [] as Player[],
      duration: "",
      isCooperative: false,
      isWin: false,
      isTeamMatch: false,
      winningTeam: "",
    },
  });

  useEffect(() => {
    const requestOptions: RequestInit = {
      method: "GET",
    };
    // Check the JWT_STORAGE value and set credentials or headers accordingly
    if (JWT_STORAGE === "cookie") {
      requestOptions.credentials = "include";
    } else if (JWT_STORAGE === "localstorage") {
      requestOptions.headers = {
        Authorization: `Bearer ${localStorage.getItem("jwt_token")}`,
      };
    }

    fetch(`${API_URL}/games`, requestOptions)
      .then((response) => response.json())
      .then((data: Game[]) => {
        const sortedGames = data.sort((a, b) => a.name.localeCompare(b.name));
        setGames(sortedGames);
      })
      .catch((error) => console.error("Error fetching games:", error));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/players`)
      .then((response) => response.json())
      .then((data: Player[]) => {
        const sortedPlayers = data.sort((a, b) =>
          a.username.localeCompare(b.username)
        );
        setPlayers(sortedPlayers);
      })
      .catch((error) => console.error("Error fetching players:", error));
  }, []);

  useEffect(() => {
    if (!form.values.isTeamMatch) {
      // Clear the teams array if the match is not a team match
      setTeams([]);
      // Clear the winning team if the match is not a team match
      form.setFieldValue("winningTeam", "");
      // Clear the team field for each player if the match is not a team match
      const updatedPlayers = form.values.players.map((player) => ({
        ...player,
        team: ""
      }));
      form.setFieldValue("players", updatedPlayers);
    }
  }, [form, form.values.isTeamMatch]);

  const handleValueSelect = (username: string) => {
    const selectedPlayer = players.find((player) => player.username === username);
    if (selectedPlayer) {
      console.log("Selected player:", selectedPlayer);
      form.setFieldValue("players", [
        ...form.values.players,
        { _id: selectedPlayer._id, score: "", name: selectedPlayer.username, username: selectedPlayer.username, team: "" },
      ]);
    }
  };

  const handleGameSelect = (gameName: string) => {
    const selectedGame = games.find((game) => game.name === gameName);
    if (selectedGame) {
      form.setFieldValue("game", selectedGame.name);
      form.setFieldValue("game_id", selectedGame.bgg_id);
      form.setFieldValue("isCooperative", selectedGame.is_cooperative);
    }
  };

  const handleScoreChange = (index: number, score: string) => {
    const updatedPlayers = [...form.values.players];
    updatedPlayers[index].score = score;
    form.setFieldValue("players", updatedPlayers);
  };

  const handleTeamChange = (index: number, team: string) => {
    const updatedPlayers = [...form.values.players];
    updatedPlayers[index].team = team;
    form.setFieldValue("players", updatedPlayers);
  }

  const handleValueRemove = (username: string) => {
    form.setFieldValue(
      "players",
      form.values.players.filter((player) => player.name !== username)
    );
  };

  const handleAddTeam = (teamName: string) => {
    if (teamName && !teams.includes(teamName)) {
      setTeams([...teams, teamName]);
    }
  };

  const values = form.values.players.map((player) => (
    <Pill key={player.name} withRemoveButton onRemove={() => handleValueRemove(player.name)}>
      {player.name}
    </Pill>
  ));

  const options = players
    .filter((player) => player.username.toLowerCase().includes(search.trim().toLowerCase()))
    .map((player) => (
      <Combobox.Option
        value={player.username}
        key={player.username}
        active={form.values.players.some((p) => p.name === player.username)}
      >
        <Group gap="sm">
          {form.values.players.some((p) => p.name === player.username) ? <CheckIcon size={12} /> : null}
          <span>{player.username}</span>
        </Group>
      </Combobox.Option>
    ));

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);

    const data = new FormData();
    data.append("game", values.game);
    data.append("game_id", values.game_id);
    data.append("note", values.note);
    data.append("date", values.date);
    if (values.image) {
      data.append("image", values.image);
    }
    data.append("duration", values.duration);
    data.append("isWin", values.isWin.toString());
    data.append("isTeamMatch", values.isTeamMatch.toString());
    data.append("winningTeam", values.winningTeam);

    if (Array.isArray(values.players)) {
      values.players.forEach((player, index) => {
        data.append(`players[${index}][id]`, player._id);
        data.append(`players[${index}][score]`, player.score);
        data.append(`players[${index}][name]`, player.name);
        data.append(`players[${index}][team]`, player.team);
      });
    }
    //console.log("Data:", values);
    try {

      const requestOptions: RequestInit = {
        method: "POST",
      };

      // Check the JWT_STORAGE value and set credentials or headers accordingly
      if (JWT_STORAGE === "cookie") {
        requestOptions.credentials = "include";
      } else if (JWT_STORAGE === "localstorage") {
        requestOptions.headers = {
          Authorization: `Bearer ${localStorage.getItem("jwt_token")}`,
        };
      }

      requestOptions.body = data;

      const response = await fetch(`${API_URL}/logmatch`, requestOptions);

      if (response.ok) {
        const data = await response.json();
        console.log("Success:", data);
        navigate("/");
      } else {
        console.error("Error:", response.statusText);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box pos="relative" w={320} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
        <Select
          label="Game"
          placeholder="Select a game"
          data={games.map((game) => ({ value: game.name, label: game.name }))}
          onChange={(value) => {
            if (value) {
              handleGameSelect(value);
            }
            if (value !== null) {
              form.setFieldValue("game", value);
            }
          }}
          value={form.values.game}
          required
        />
        {!form.values.isCooperative && (
          <Checkbox label="Team match" {...form.getInputProps("isTeamMatch", { type: "checkbox" })} />
        )}

        <Combobox store={combobox} onOptionSubmit={handleValueSelect}>
          <Combobox.DropdownTarget>
            <PillsInput label="Players" onClick={() => combobox.openDropdown()}>
              <Pill.Group>
                {values}
                <Combobox.EventsTarget>
                  <PillsInput.Field
                    onFocus={() => combobox.openDropdown()}
                    onBlur={() => combobox.closeDropdown()}
                    value={search}
                    placeholder="Search values"
                    onChange={(event) => {
                      combobox.updateSelectedOptionIndex();
                      setSearch(event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace" && search.length === 0) {
                        event.preventDefault();
                        handleValueRemove(form.values.players[form.values.players.length - 1].name);
                      }
                    }}
                  />
                </Combobox.EventsTarget>
              </Pill.Group>
            </PillsInput>
          </Combobox.DropdownTarget>
          <Combobox.Dropdown>
            <Combobox.Options>
              {options.length > 0 ? options : <Combobox.Empty>Nothing found...</Combobox.Empty>}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>

        {form.values.isTeamMatch && (
          <>
            <TextInput
              label="Add Team"
              placeholder="Enter a team name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTeam(e.currentTarget.value)
                  e.currentTarget.value = ""
                }
              }}
            />

            {form.values.players.map((player, index) => (
              <Select
                key={player._id}
                label={`Select team for ${player.name}`}
                placeholder="Select a team"
                data={teams.map((team) => ({ value: team, label: team }))}
                onChange={(value) => { handleTeamChange(index, value || "") }}
                required
              />
            ))}
            <Select
              label="Winning Team"
              placeholder="Select a team"
              data={teams.map((team) => ({ value: team, label: team }))}
              onChange={(value) => form.setFieldValue("winningTeam", value || "")}
              required
            />
          </>
        )}

        <TextInput
          label="Duration"
          type="number"
          placeholder="Enter duration in minutes"
          {...form.getInputProps("duration")}
          required
        />
        <Textarea label="Note" placeholder="Enter notes" {...form.getInputProps("note")} />
        <TextInput label="Date" type="date" {...form.getInputProps("date")} required />
        <TextInput
          label="Upload Image"
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files ? event.currentTarget.files[0] : null;
            form.setFieldValue("image", file);
          }}
          accept="image/*"
        />
        {form.values.isCooperative && (
          <Checkbox label="Match won" {...form.getInputProps("isWin", { type: "checkbox" })} />
        )}
        {!form.values.isCooperative && !form.values.isTeamMatch && (
          <div>
            {form.values.players.map((player, index) => (
              <div key={player._id}>
                <NumberInput
                  label={`${player.name} score`}
                  value={parseInt(player.score)}
                  onChange={(value) => handleScoreChange(index, value.toString())}
                  min={0}
                  required
                />
              </div>
            ))}
          </div>
        )}
        <Group justify="space-between" mt="md">
          <Button type="submit" disabled={loading}>
            Log Game
          </Button>
        </Group>
      </form>
    </Box>
  );
};

export default LogMatch;
