if status is-interactive
    # Commands to run in interactive sessions can go here
    starship init fish | source
end

# oMLX command-line tool (omlx start/stop/restart)
fish_add_path -g ~/.omlx/bin
