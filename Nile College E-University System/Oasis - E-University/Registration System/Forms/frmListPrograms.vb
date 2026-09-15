Imports System.Data.SqlClient

Public Class frmAddPrograms

    Private Sub ToolStripButton1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)

    End Sub

    Private Sub btnAdd_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnAdd.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim ProgramName As String

            ProgramName = InputBox("الرجاء إدخال البرنامج")

            If ProgramName = "" Then
                Me.Cursor = Cursors.Default
                Exit Sub
            Else
                Dim cmd As New SqlCommand("Insert Into Programs (ProgramName) Values (N'" & ProgramName & "')", cnn)

                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                Me.TreePrograms.Nodes.Add(ProgramName)
                'FillTree()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub btnAddSub_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnAddSub.Click
        Try
            If Me.TreePrograms.SelectedNode.Index = -1 Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor

                Dim ProgramLevel As String

                ProgramLevel = InputBox("الرجاء إدخال المستوى")

                If ProgramLevel = "" Then
                    Me.Cursor = Cursors.Default
                    Exit Sub
                Else
                    Dim StrIns As String

                    If Me.TreePrograms.SelectedNode.Level = 0 Then
                        StrIns = "Insert Into Programs (ProgramName,ProgramLevel) Values (N'" & Me.TreePrograms.SelectedNode.Text & "',N'" & ProgramLevel & "')"
                        'StrIns = "insert into Programs (ProgramLevel) Values (N'" & ProgramLevel & "')"
                    End If

                    Dim cmd As New SqlCommand(StrIns, cnn)

                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    Me.TreePrograms.SelectedNode.Nodes.Add(ProgramLevel)
                    'FillTree()
                End If
                Me.Cursor = Cursors.Default
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Sub FillTree()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select Distinct ProgramName From Programs Where ProgramName Is Not Null", cnn)
            Dim Reader, Reader1 As SqlDataReader
            Dim i As Integer

            Me.TreePrograms.Nodes.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.TreePrograms.Nodes.Add(Reader.Item(0))
                Dim cmd1 As New SqlCommand("Select Distinct ProgramLevel From Programs Where ProgramName=N'" & Reader.Item(0) & _
                                           "' and ProgramLevel Is Not Null", cnn1)

                cnn1.Open()
                Reader1 = cmd1.ExecuteReader
                While Reader1.Read
                    Me.TreePrograms.Nodes(i).Nodes.Add(Reader1.Item(0))
                End While

                cnn1.Close()
                i += 1
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub btnDelete_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnDelete.Click
        Try
            If Me.TreePrograms.SelectedNode.Level = -1 Then
                Exit Sub
            Else
                If MsgBox("Confirm Delete?", MsgBoxStyle.YesNoCancel) = MsgBoxResult.Yes Then
                    Me.Cursor = Cursors.WaitCursor
                    Dim StrIns As String

                    Select Case Me.TreePrograms.SelectedNode.Level
                        Case 0
                            StrIns = "Delete From Programs Where ProgramName=N'" & Me.TreePrograms.SelectedNode.Text & "'"
                        Case 1
                            StrIns = "Delete From Programs Where ProgramName=N'" & Me.TreePrograms.SelectedNode.Parent.Text & _
                                     "' and ProgramLevel=N'" & Me.TreePrograms.SelectedNode.Text & "'"
                    End Select

                    Dim cmd As New SqlCommand(StrIns, cnn)

                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    FillTree()
                    Me.Cursor = Cursors.Default
                End If
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmAddPrograms_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillTree()
    End Sub

    Private Sub TreePrograms_AfterSelect(ByVal sender As System.Object, ByVal e As System.Windows.Forms.TreeViewEventArgs) Handles TreePrograms.AfterSelect
        If Me.TreePrograms.SelectedNode.Level = 0 Then
            Me.btnAdd.Enabled = True
            Me.btnAddSub.Enabled = True

        ElseIf Me.TreePrograms.SelectedNode.Level = 1 Then
            Me.btnAdd.Enabled = True
            Me.btnAddSub.Enabled = False

        End If
    End Sub
End Class