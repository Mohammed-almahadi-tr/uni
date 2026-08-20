Imports System.Data.SqlClient
Public Class frmSearchStudID

    Sub FillPrograms()
        Try
            Me.CombProgram.Items.Clear()
            Dim ProgramList As New ArrayList
            ProgramList = GetProgramlist()

            For Each ProgramName As String In ProgramList
                Me.CombProgram.Items.Add(ProgramName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub
    Private Sub frmSearchStudID_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillPrograms()
        SelStudID = ""
        SelStudName = ""
        Me.txtStdName.Focus()
    End Sub
    Sub LoadStd()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim Program As String = ""

            If Me.CombProgram.SelectedIndex <> -1 Then
                Program = " and Program=N'" & Me.CombProgram.SelectedItem & "' "
            End If

            Dim cmd As New SqlCommand("Select StudentIndex,StudentName,Program From StudentsProfilees " & _
                                      "Where StudentName like N'" & Me.txtStdName.Text & "%' " & _
                                      Program & "Order by StudentName", cnn)
            Dim Reader As SqlDataReader
            Me.ListView1.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While (Reader.Read)
                With ListView1.Items.Add(Reader.Item(0))
                    .SubItems.Add(Reader.Item(1))
                    .SubItems.Add(Reader.Item(2))
                End With
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub
    Public Function GetProgramList() As ArrayList
        Try
            Dim cmd As New SqlCommand("Select Distinct Program From StudentsProfilees", cnn1)
            Dim Reader As SqlDataReader
            Dim ProgramList As New ArrayList

            cnn1.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                ProgramList.Add(Reader.Item(0))
            End While
            cnn1.Close()

            Return ProgramList
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
        End Try
    End Function

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        LoadStd()
    End Sub

    Private Sub ListView1_DoubleClick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ListView1.DoubleClick
        If Me.ListView1.SelectedIndices.Count <> 0 Then
            SelStudID = Me.ListView1.SelectedItems.Item(0).Text
            SelStudName = Me.ListView1.SelectedItems.Item(0).SubItems(1).Text
            SelProgram = Me.ListView1.SelectedItems.Item(0).SubItems(2).Text
            Me.Close()
        End If
    End Sub

    Private Sub GroupBox1_Enter(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles GroupBox1.Enter

    End Sub
End Class